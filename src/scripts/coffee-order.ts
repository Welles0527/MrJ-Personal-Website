import cloudbase from '@cloudbase/js-sdk';

type Temperature = 'hot' | 'cold';
type OrderStatus = 'new' | 'brewing' | 'ready' | 'done';

type Product = {
  id: string;
  nameZh: string;
  nameEn: string;
  temperatures: Temperature[];
};

type CartItem = Product & {
  temperature: Temperature;
  quantity: number;
};

type CoffeeOrder = {
  _id?: string;
  kind: 'order';
  shopId: string;
  orderNo: string;
  customerName: string;
  status: OrderStatus;
  items: CartItem[];
  itemCount: number;
  createdAtIso: string;
  updatedAtIso: string;
  _openid?: string;
};

type CloudLoginState = {
  user?: { uid?: string; email?: string } | null;
  isAnonymousAuth?: boolean;
} | null;

type CloudWatcher = { close: () => Promise<unknown> | unknown };

const ENV_ID = 'magicj-web-d5g9yvowj6862f7a2';
const COLLECTION = 'officialWebsiteCoffeeOrders';
const SHOP_ID = 'morning-coffee-studio';
const MERCHANT_UID = '2088473556664164354';
const MERCHANT_EMAIL = 'coffee-barista@magicj.cn';
const ADMIN_UIDS = new Set([MERCHANT_UID, '2064712423935315968']);
const ADMIN_EMAILS = new Set([MERCHANT_EMAIL, '49001422@qq.com']);
const CART_KEY = 'coffee-order:cart:v1';
const LATEST_ORDER_KEY = 'coffee-order:latest-order:v1';
const CUSTOMER_NAME_KEY = 'coffee-order:customer-name:v1';

const PRODUCTS: Product[] = [
  { id: 'americano', nameZh: '美式', nameEn: 'Americano', temperatures: ['hot', 'cold'] },
  { id: 'flat-white', nameZh: '澳白', nameEn: 'Flat White', temperatures: ['hot'] },
  { id: 'latte', nameZh: '拿铁', nameEn: 'Caffè Latte', temperatures: ['hot'] },
  { id: 'osmanthus-latte', nameZh: '桂花拿铁', nameEn: 'Osmanthus Latte', temperatures: ['hot'] },
  { id: 'dirty', nameZh: 'Dirty', nameEn: 'Dirty', temperatures: ['cold'] },
  { id: 'espresso', nameZh: '浓缩', nameEn: 'Espresso', temperatures: ['hot'] },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: '等待接单',
  brewing: '制作中',
  ready: '可以取餐',
  done: '已完成',
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus> = {
  new: 'brewing',
  brewing: 'ready',
  ready: 'done',
  done: 'done',
};

const NEXT_ACTION: Record<OrderStatus, string> = {
  new: '开始制作',
  brewing: '通知取餐',
  ready: '完成订单',
  done: '已完成',
};

const app = cloudbase.init({ env: ENV_ID });
const auth = app.auth({ persistence: 'local' });
const db = app.database();

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);
const $$ = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];
const temperatureLabel = (temperature: Temperature) => temperature === 'hot' ? '热' : '冷';
const productById = (productId: string) => PRODUCTS.find((product) => product.id === productId);

const parseStored = <T>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
};

const safeText = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const orderIdFromResult = (result: unknown) => {
  if (!result || typeof result !== 'object') return '';
  const record = result as Record<string, unknown>;
  if (typeof record._id === 'string') return record._id;
  if (typeof record.id === 'string') return record.id;
  if (record.data && typeof record.data === 'object') {
    const data = record.data as Record<string, unknown>;
    if (typeof data._id === 'string') return data._id;
    if (typeof data.id === 'string') return data.id;
  }
  return '';
};

const cloudMessage = (error: unknown, fallback = '连接门店失败，请稍后重试。') => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
};

const setCloudStatus = (state: 'connecting' | 'online' | 'offline', label: string) => {
  const status = $('#cloudStatus');
  if (!status) return;
  status.dataset.state = state;
  const text = status.querySelector('span');
  if (text) text.textContent = label;
};

let toastTimer = 0;
const showToast = (message: string) => {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
};

const getLoginState = async () => await auth.getLoginState() as CloudLoginState;

const ensureCloudSession = async () => {
  let state = await getLoginState();
  if (!state?.user?.uid) {
    await auth.signInAnonymously();
    state = await getLoginState();
  }
  if (!state?.user?.uid) throw new Error('没有取得门店连接身份。');
  setCloudStatus('online', state.isAnonymousAuth ? '门店在线 · 匿名点单' : '门店在线');
  return state;
};

const isMerchant = (state: CloudLoginState) => Boolean(
  (state?.user?.uid && ADMIN_UIDS.has(state.user.uid)) || (state?.user?.email && ADMIN_EMAILS.has(state.user.email)),
);

const pickupNumber = () => {
  const now = new Date();
  const sequence = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`.slice(-4);
  return `A${sequence}`;
};

const orderDocumentId = () => {
  const randomParts = new Uint32Array(4);
  crypto.getRandomValues(randomParts);
  return `coffee-${Date.now().toString(36)}-${[...randomParts].map((part) => part.toString(16).padStart(8, '0')).join('')}`;
};

const normalizeOrder = (value: unknown): CoffeeOrder | null => {
  if (!value || typeof value !== 'object') return null;
  const order = value as CoffeeOrder;
  if (order.kind !== 'order' || order.shopId !== SHOP_ID || !order.orderNo || !Array.isArray(order.items)) return null;
  order.customerName = typeof order.customerName === 'string' && order.customerName.trim() ? order.customerName.trim() : '未填写姓名';
  return order;
};

const renderCustomerOrder = (order: CoffeeOrder) => {
  const section = $('#orderHistory');
  const target = $('#customerOrderCard');
  if (!section || !target) return;
  section.hidden = false;
  target.innerHTML = `
    <article class="order-history-card">
      <header><div><small>${safeText(order.customerName)}</small><h3>${safeText(order.orderNo)}</h3></div><span class="status-badge" data-status="${safeText(order.status)}">${safeText(STATUS_LABEL[order.status] || order.status)}</span></header>
      <ul>${order.items.map((item) => `<li><span>${safeText(item.nameZh)} · ${temperatureLabel(item.temperature)}</span><strong>× ${item.quantity}</strong></li>`).join('')}</ul>
    </article>`;
};

const startCustomerOrderWatch = (orderId: string, ownerId: string, fallbackOrder?: CoffeeOrder) => {
  if (fallbackOrder) renderCustomerOrder(fallbackOrder);
  if (!orderId) return null;
  let closed = false;
  const syncOnce = async () => {
    if (closed) return;
    try {
      const result = await db.collection(COLLECTION).where({ _id: orderId, _openid: ownerId }).limit(1).get() as { data?: unknown[] | unknown };
      const record = Array.isArray(result.data) ? result.data[0] : result.data;
      const order = normalizeOrder(record);
      if (order) renderCustomerOrder(order);
    } catch {
      setCloudStatus('offline', '订单状态同步中断');
    }
  };
  const pollingTimer = window.setInterval(() => { void syncOnce(); }, 2500);
  const realtimeWatcher = db.collection(COLLECTION).where({ _id: orderId, _openid: ownerId }).limit(1).watch({
    onChange: (snapshot: { docs?: unknown[] }) => {
      const order = normalizeOrder(snapshot.docs?.[0]);
      if (order) renderCustomerOrder(order);
    },
    onError: () => { void syncOnce(); },
  }) as CloudWatcher;
  void syncOnce();
  return {
    close: async () => {
      closed = true;
      window.clearInterval(pollingTimer);
      await realtimeWatcher.close();
    },
  } satisfies CloudWatcher;
};

const initializeCustomer = async () => {
  let cart = parseStored<CartItem[]>(CART_KEY, []).filter((item) => productById(item.id) && item.quantity > 0);
  let selectedAmericanoTemp: Temperature = 'hot';
  let orderWatcher: CloudWatcher | null = null;
  const customerNameInput = $('#customerName') as HTMLInputElement | null;
  if (customerNameInput) {
    customerNameInput.value = localStorage.getItem(CUSTOMER_NAME_KEY) || '';
    customerNameInput.addEventListener('input', () => localStorage.setItem(CUSTOMER_NAME_KEY, customerNameInput.value.slice(0, 20)));
  }

  const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
  const totalQuantity = () => cart.reduce((total, item) => total + item.quantity, 0);

  const renderCart = () => {
    const count = totalQuantity();
    const countNode = $('#cartCount');
    const label = $('#cartLabel');
    const checkout = $('#checkoutButton') as HTMLButtonElement | null;
    const lines = $('#cartLines');
    if (countNode) countNode.textContent = String(count);
    if (label) label.textContent = count ? `${cart.length} 种咖啡 · 共 ${count} 杯` : '还没有选择咖啡';
    if (checkout) checkout.disabled = count === 0;
    if (lines) {
      lines.innerHTML = cart.length ? cart.map((item) => `
        <div class="cart-line">
          <div><strong>${safeText(item.nameZh)}</strong><small>${safeText(item.nameEn)} · ${temperatureLabel(item.temperature)}</small></div>
          <div class="quantity-control"><button type="button" data-cart-change="-1" data-cart-id="${safeText(item.id)}" data-cart-temp="${item.temperature}" aria-label="减少一杯">−</button><b>${item.quantity}</b><button type="button" data-cart-change="1" data-cart-id="${safeText(item.id)}" data-cart-temp="${item.temperature}" aria-label="增加一杯">+</button></div>
        </div>`).join('') : '<p class="empty-cart">还没有选择咖啡。</p>';
    }
    saveCart();
  };

  const changeItem = (productId: string, temperature: Temperature, delta: number) => {
    const product = productById(productId);
    if (!product || !product.temperatures.includes(temperature)) return;
    const current = cart.find((item) => item.id === productId && item.temperature === temperature);
    if (current) current.quantity += delta;
    else if (delta > 0) cart.push({ ...product, temperature, quantity: delta });
    cart = cart.filter((item) => item.quantity > 0);
    renderCart();
  };

  $$('.temp-button').forEach((button) => button.addEventListener('click', () => {
    selectedAmericanoTemp = button.dataset.temp === 'cold' ? 'cold' : 'hot';
    $$('.temp-button').forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
  }));

  $$('.add-button').forEach((button) => button.addEventListener('click', () => {
    const product = productById(button.dataset.add || '');
    if (!product) return;
    const temperature = product.id === 'americano' ? selectedAmericanoTemp : product.temperatures[0];
    changeItem(product.id, temperature, 1);
    showToast(`${product.nameZh}（${temperatureLabel(temperature)}）已加入`);
  }));

  $('#cartLines')?.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-cart-change]');
    if (!button) return;
    changeItem(button.dataset.cartId || '', button.dataset.cartTemp === 'cold' ? 'cold' : 'hot', Number(button.dataset.cartChange));
  });

  const setPopover = (open: boolean) => {
    const popover = $('#cartPopover');
    const summary = $('#cartSummary');
    if (popover) popover.hidden = !open;
    summary?.setAttribute('aria-expanded', String(open));
  };
  $('#cartSummary')?.addEventListener('click', () => setPopover($('#cartPopover')?.hidden ?? true));
  $('#closeCart')?.addEventListener('click', () => setPopover(false));
  $('#clearCart')?.addEventListener('click', () => { cart = []; renderCart(); setPopover(false); });

  $('#checkoutButton')?.addEventListener('click', async () => {
    const button = $('#checkoutButton') as HTMLButtonElement | null;
    if (!cart.length || !button) return;
    const customerName = (customerNameInput?.value || '').replace(/\s+/g, ' ').trim();
    if (!customerName) {
      customerNameInput?.focus();
      showToast('请先输入取餐姓名。');
      return;
    }
    localStorage.setItem(CUSTOMER_NAME_KEY, customerName);
    button.disabled = true;
    button.textContent = '正在发送…';
    try {
      const session = await ensureCloudSession();
      const now = new Date().toISOString();
      const order: CoffeeOrder = {
        _id: orderDocumentId(),
        kind: 'order',
        shopId: SHOP_ID,
        orderNo: pickupNumber(),
        customerName,
        status: 'new',
        items: cart.map((item) => ({ ...item })),
        itemCount: totalQuantity(),
        createdAtIso: now,
        updatedAtIso: now,
      };
      const result = await db.collection(COLLECTION).add(order);
      const orderId = orderIdFromResult(result) || order._id || '';
      const ownerId = session.user?.uid || '';
      localStorage.setItem(LATEST_ORDER_KEY, JSON.stringify({ orderId, ownerId, order }));
      cart = [];
      renderCart();
      setPopover(false);
      orderWatcher?.close();
      orderWatcher = startCustomerOrderWatch(orderId, ownerId, order);
      const dialog = $('#orderDialog') as HTMLDialogElement | null;
      const number = $('#pickupNumber');
      if (number) number.textContent = order.orderNo;
      dialog?.showModal();
    } catch (error) {
      setCloudStatus('offline', '门店暂时离线');
      showToast(cloudMessage(error, '订单没有发送成功，请重试。'));
    } finally {
      button.disabled = !cart.length;
      button.innerHTML = '确认下单 <span>→</span>';
    }
  });

  $('#closeOrderDialog')?.addEventListener('click', () => {
    ($('#orderDialog') as HTMLDialogElement | null)?.close();
    $('#orderHistory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const latest = parseStored<{ orderId?: string; ownerId?: string; order?: CoffeeOrder } | null>(LATEST_ORDER_KEY, null);
  renderCart();
  try {
    const session = await ensureCloudSession();
    const ownerId = session.user?.uid || '';
    if (latest?.order && latest.ownerId === ownerId) orderWatcher = startCustomerOrderWatch(latest.orderId || '', ownerId, latest.order);
  } catch { setCloudStatus('offline', '门店暂时离线'); }
  window.addEventListener('beforeunload', () => { void orderWatcher?.close(); }, { once: true });
};

const formatTime = (iso: string) => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const initializeBarista = async () => {
  const loginSection = $('#baristaLogin');
  const board = $('#baristaBoard');
  const form = $('#baristaLoginForm') as HTMLFormElement | null;
  let orders: CoffeeOrder[] = [];
  let filter: 'active' | 'all' | 'done' = 'active';
  let watcher: CloudWatcher | null = null;

  const renderBoard = () => {
    const visible = orders.filter((order) => filter === 'all' || (filter === 'done' ? order.status === 'done' : order.status !== 'done'));
    const counts = (status: OrderStatus) => orders.filter((order) => order.status === status).length;
    const setCount = (selector: string, value: number) => { const node = $(selector); if (node) node.textContent = String(value); };
    setCount('#newCount', counts('new'));
    setCount('#brewingCount', counts('brewing'));
    setCount('#readyCount', counts('ready'));
    setCount('#cupCount', orders.reduce((total, order) => total + Number(order.itemCount || 0), 0));
    const list = $('#orderList');
    if (!list) return;
    list.innerHTML = visible.length ? `<div class="order-table-wrap"><table class="order-table"><thead><tr><th>顾客</th><th>饮品</th><th>下单时间</th><th>状态</th><th>操作</th></tr></thead><tbody>${visible.map((order) => `
      <tr data-order-id="${safeText(order._id)}">
        <td><strong class="order-customer-name">${safeText(order.customerName)}</strong><small>${safeText(order.orderNo)} · 共 ${order.itemCount} 杯</small></td>
        <td class="order-items">${order.items.map((item) => `<span>${safeText(item.nameZh)} · ${temperatureLabel(item.temperature)} × ${item.quantity}</span>`).join('')}</td>
        <td><time>${formatTime(order.createdAtIso)}</time></td>
        <td><span class="status-badge" data-status="${order.status}">${STATUS_LABEL[order.status]}</span></td>
        <td><div class="ticket-actions"><button class="delete-action" type="button" data-delete-order>删除</button><button class="status-action" type="button" data-status-action="${order.status}" ${order.status === 'done' ? 'disabled' : ''}>${NEXT_ACTION[order.status]}</button></div></td>
      </tr>`).join('')}</tbody></table></div>` : '<div class="empty-board">当前筛选下没有订单，来杯咖啡等一等。</div>';
  };

  const showBoard = () => {
    if (loginSection) loginSection.hidden = true;
    if (board) board.hidden = false;
  };

  const startWatch = () => {
    watcher?.close();
    let closed = false;
    let syncing = false;
    const query = db.collection(COLLECTION).where({ kind: 'order', shopId: SHOP_ID });
    const applyOrders = (records: unknown[]) => {
      orders = records.map(normalizeOrder).filter((order): order is CoffeeOrder => Boolean(order))
        .sort((first, second) => second.createdAtIso.localeCompare(first.createdAtIso));
      renderBoard();
      const sync = $('#lastSync');
      if (sync) sync.textContent = `已同步 · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
      setCloudStatus('online', '订单实时同步中');
    };
    const syncOnce = async () => {
      if (closed || syncing) return;
      syncing = true;
      try {
        const result = await query.limit(100).get() as { data?: unknown[] };
        applyOrders(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        setCloudStatus('offline', '订单同步中断');
        showToast(cloudMessage(error));
      } finally {
        syncing = false;
      }
    };
    const pollingTimer = window.setInterval(() => { void syncOnce(); }, 3500);
    const realtimeWatcher = query.watch({
      onChange: (snapshot: { docs?: unknown[] }) => {
        applyOrders(snapshot.docs || []);
      },
      onError: (error: unknown) => {
        console.warn('[coffee-order] realtime channel unavailable, using polling', cloudMessage(error));
        void syncOnce();
      },
    }) as CloudWatcher;
    watcher = {
      close: async () => {
        closed = true;
        window.clearInterval(pollingTimer);
        await realtimeWatcher.close();
      },
    };
    void syncOnce();
  };

  const enterIfMerchant = async () => {
    const state = await getLoginState();
    if (!isMerchant(state)) return false;
    showBoard();
    startWatch();
    setCloudStatus('online', '店员端在线');
    return true;
  };

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const message = $('#loginMessage');
    const account = ($('#baristaAccount') as HTMLInputElement | null)?.value.trim() || '';
    const email = account === 'J先生' ? MERCHANT_EMAIL : account;
    const password = ($('#baristaPassword') as HTMLInputElement | null)?.value || '';
    if (submit) { submit.disabled = true; submit.textContent = '正在登录…'; }
    if (message) message.textContent = '';
    try {
      await auth.signOut();
      await auth.signInWithPassword({ email, password });
      if (!await enterIfMerchant()) {
        await auth.signOut();
        throw new Error('这个账号没有店员权限。');
      }
    } catch (error) {
      if (message) message.textContent = cloudMessage(error, '登录失败，请检查邮箱和密码。');
      setCloudStatus('offline', '等待店员登录');
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = '进入订单台'; }
    }
  });

  $$('.order-toolbar button').forEach((button) => button.addEventListener('click', () => {
    filter = button.dataset.filter === 'all' ? 'all' : button.dataset.filter === 'done' ? 'done' : 'active';
    $$('.order-toolbar button').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
    renderBoard();
  }));

  $('#orderList')?.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-status-action], [data-delete-order]');
    const ticket = button?.closest<HTMLElement>('[data-order-id]');
    if (!button || !ticket || button.disabled) return;
    const orderId = ticket.dataset.orderId || '';
    if (button.hasAttribute('data-delete-order')) {
      if (!window.confirm('确定删除这笔订单吗？此操作无法恢复。')) return;
      button.disabled = true;
      try {
        await db.collection(COLLECTION).doc(orderId).remove();
      } catch (error) {
        button.disabled = false;
        showToast(cloudMessage(error, '订单删除失败。'));
      }
      return;
    }
    const current = button.dataset.statusAction as OrderStatus;
    const next = NEXT_STATUS[current];
    button.disabled = true;
    try {
      await db.collection(COLLECTION).doc(orderId).update({ status: next, updatedAtIso: new Date().toISOString() });
    } catch (error) {
      button.disabled = false;
      showToast(cloudMessage(error, '订单状态没有更新成功。'));
    }
  });

  $('#exportButton')?.addEventListener('click', () => {
    if (!orders.length) return showToast('今天还没有可导出的订单。');
    const today = new Date().toLocaleDateString('sv-SE');
    const details = [['顾客姓名', '订单号', '下单时间', '状态', '咖啡', '英文名', '温度', '数量']];
    const totals = new Map<string, { nameZh: string; nameEn: string; temperature: string; quantity: number }>();
    orders.forEach((order) => order.items.forEach((item) => {
      details.push([order.customerName, order.orderNo, order.createdAtIso, STATUS_LABEL[order.status], item.nameZh, item.nameEn, temperatureLabel(item.temperature), String(item.quantity)]);
      const key = `${item.id}:${item.temperature}`;
      const current = totals.get(key) || { nameZh: item.nameZh, nameEn: item.nameEn, temperature: temperatureLabel(item.temperature), quantity: 0 };
      current.quantity += item.quantity;
      totals.set(key, current);
    }));
    details.push([], ['汇总', '', '', '', '', '', '', ''], ['咖啡', '英文名', '温度', '杯数']);
    totals.forEach((item) => details.push([item.nameZh, item.nameEn, item.temperature, String(item.quantity)]));
    const csv = `\uFEFF${details.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `咖啡订单汇总-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('今日订单汇总已导出。');
  });

  try {
    if (!await enterIfMerchant()) setCloudStatus('offline', '等待店员登录');
  } catch { setCloudStatus('offline', '等待店员登录'); }
  window.addEventListener('beforeunload', () => { void watcher?.close(); }, { once: true });
};

export const initializeCoffeeOrder = () => {
  const mode = new URLSearchParams(window.location.search).get('mode');
  const isBaristaMode = mode === 'barista';
  const customerView = $('#customerView');
  const baristaView = $('#baristaView');
  const cartBar = $('#cartBar');
  if (customerView) customerView.hidden = isBaristaMode;
  if (baristaView) baristaView.hidden = !isBaristaMode;
  if (cartBar) cartBar.hidden = isBaristaMode;
  void (isBaristaMode ? initializeBarista() : initializeCustomer());
};
