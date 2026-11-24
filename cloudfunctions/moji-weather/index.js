'use strict';

const ORIGIN = 'https://tianqi.moji.com';
const TTL = 30 * 60 * 1000;
const cache = new Map();
const pending = new Map();
const cityPaths = new Map([['上海', '/forecast15/china/shanghai/shanghai']]);
const decode = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&(?:nbsp|#160);/g, ' ').replace(/&amp;/g, '&').trim();
const beijingDate = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

function weatherCode(label) {
  if (/雷/.test(label)) return 95;
  if (/雨夹雪/.test(label)) return 77;
  if (/冻雨/.test(label)) return 56;
  if (/暴雪|大雪/.test(label)) return 75;
  if (/中雪/.test(label)) return 73;
  if (/雪/.test(label)) return 71;
  if (/暴雨|大雨/.test(label)) return 65;
  if (/中雨/.test(label)) return 63;
  if (/阵雨/.test(label)) return 80;
  if (/雨/.test(label)) return 61;
  if (/雾|霾|沙|尘/.test(label)) return 45;
  if (/阴/.test(label)) return 3;
  if (/多云/.test(label)) return 2;
  if (/少云/.test(label)) return 1;
  if (/晴/.test(label)) return 0;
  return null;
}

function parseForecast(html, sourceUrl, requestedCity) {
  const dateMatch = html.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  const region = html.match(/<div\b[^>]*class="[^"]*\bwea_list\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/)?.[1];
  if (!dateMatch || !region) throw new Error('墨迹天气页面格式已变化，暂时无法读取');
  const sourceDate = `${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')}`;
  const base = Date.parse(sourceDate+'T00:00:00Z');
  if (!Number.isFinite(base) || Math.abs(Date.parse(beijingDate()+'T00:00:00Z')-base) > 2*86400000) throw new Error('墨迹天气页面日期已过期，暂不显示旧预报');
  const year = Number(dateMatch[1]), seen = new Set(), days = [];
  for (const match of region.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)) {
    const item = match[1];
    const labels = [...item.matchAll(/<span\b[^>]*class="wea"[^>]*>([\s\S]*?)<\/span>/g)].map(m=>decode(m[1]));
    const md = item.match(/<span\b[^>]*class="week"[^>]*>\s*(\d{1,2})\/(\d{1,2})\s*<\/span>/);
    const code = weatherCode(labels[0]);
    if (!md || code === null) continue;
    const dates = [year-1,year,year+1].map(y=>`${y}-${md[1].padStart(2,'0')}-${md[2].padStart(2,'0')}`);
    const date = dates.sort((a,b)=>Math.abs(Date.parse(a)-base)-Math.abs(Date.parse(b)-base))[0];
    const offset = (Date.parse(date)-base)/86400000;
    if (offset < -1 || offset > 15 || seen.has(date) || new Date(date).toISOString().slice(0,10) !== date) continue;
    seen.add(date);
    const highText = decode(item.match(/<b\b[^>]*>([\s\S]*?)<\/b>/)?.[1]).replace('°','');
    const lowText = decode(item.match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/)?.[1]).replace('°','');
    const high = highText ? Number(highText) : NaN, low = lowText ? Number(lowText) : NaN;
    days.push({date,code,label:labels[0],nightLabel:labels[1]||labels[0],high:Number.isFinite(high)?high:null,low:Number.isFinite(low)?low:null});
  }
  if (days.length < 7 || !days.some(day=>day.date===sourceDate)) throw new Error('墨迹预报数据不完整，请稍后再试');
  const place = decode(html.match(/<div\b[^>]*class="search_default"[^>]*>[\s\S]*?<em[^>]*>([\s\S]*?)<\/em>/)?.[1]) || requestedCity;
  const updated = decode(html.match(/class="detail_future_title"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/)?.[1]);
  return {source:'moji',city:requestedCity,place,sourceUrl,sourceDate,sourceUpdated:updated,fetchedAt:new Date().toISOString(),days:days.sort((a,b)=>a.date.localeCompare(b.date))};
}

function parseTodayDetails(html, date) {
  const forecasts = html.matchAll(/<ul\b[^>]*class="[^"]*\bdays\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/g);
  const today = [...forecasts].find(([, forecast]) => /<a\b[^>]*href="[^"]*\/today\/china\/[^"]+"[^>]*>\s*今天\s*<\/a>/.test(forecast))?.[1];
  if (!today) return null;

  const wind = today.match(/<li\b[^>]*>\s*<em\b[^>]*>([\s\S]*?)<\/em>\s*<b\b[^>]*>([\s\S]*?)<\/b>\s*<\/li>/);
  const direction = decode(wind?.[1]);
  const level = decode(wind?.[2]).replace(/&lt;/g,'<');
  const windInfo = /^(?:[<>≤≥]|小于|大于)?\s*\d{1,2}(?:\s*[-–~～至]\s*\d{1,2})?\s*级$/.test(level)
    ? {direction,level} : null;

  const air = decode(today.match(/<strong\b[^>]*class="[^"]*\blevel_[1-6]\b[^"]*"[^>]*>([\s\S]*?)<\/strong>/)?.[1]);
  const aqi = air.match(/^(\d{1,3})\s*(优|良|(?:轻度|中度|重度|严重)(?:污染)?)$/);
  const airQuality = aqi ? {aqi:Number(aqi[1]),level:aqi[2]} : null;
  return windInfo || airQuality ? {date,wind:windInfo,airQuality} : null;
}

async function request(url, redirect='error') {
  const response = await fetch(url, {redirect,signal:AbortSignal.timeout(10000)});
  if (redirect==='manual' && response.status>=300 && response.status<400) return response;
  if (!response.ok) throw new Error(`墨迹天气暂时无法读取（HTTP ${response.status}）`);
  return response;
}

async function cityPath(city) {
  if (cityPaths.has(city)) return cityPaths.get(city);
  const response = await request(ORIGIN+'/api/citysearch/'+encodeURIComponent(city));
  const data = await response.json();
  const cities = Array.isArray(data.city_list) ? data.city_list.filter(c=>c.counname==='中国'&&Number.isSafeInteger(c.cityId)) : [];
  const normalize = text=>String(text).replace(/[\s,，]/g,'').replace(/市$/,'');
  const exact = cities.filter(c=>normalize(c.name)===normalize(city)||normalize((c.pname||'')+c.name)===normalize(city));
  const candidates = exact.length ? exact : cities;
  if (candidates.length!==1) throw new Error(candidates.length ? '城市名称不明确，请输入完整城市名称' : '墨迹天气未找到该城市，请输入中国城市名称');
  const redirect = await request(ORIGIN+'/api/redirect/'+candidates[0].cityId, 'manual');
  const location = redirect.headers.get('location');
  if (!location) throw new Error('墨迹城市页面暂不可用');
  const target = new URL(location, ORIGIN);
  if (target.hostname!=='tianqi.moji.com'||!/^\/weather\/china\/[a-z0-9_/-]+$/i.test(target.pathname)) throw new Error('墨迹城市地址异常');
  const path = target.pathname.replace('/weather/','/forecast15/');
  if (cityPaths.size>=64) cityPaths.delete(cityPaths.keys().next().value);
  cityPaths.set(city,path);
  return path;
}

async function collect(city, withTodayDetails) {
  const sourceUrl = ORIGIN+await cityPath(city);
  const forecast = request(sourceUrl).then(response=>response.text());
  const details = withTodayDetails
    ? request(sourceUrl.replace('/forecast15/','/weather/')).then(response=>response.text()).catch(()=>null)
    : null;
  const [html, detailsHtml] = await Promise.all([forecast, details]);
  if (html.length>1000000) throw new Error('墨迹天气响应异常');
  const data = parseForecast(html,sourceUrl,city);
  if (detailsHtml && detailsHtml.length<=1000000 && data.sourceDate===beijingDate()) {
    const todayDetails = parseTodayDetails(detailsHtml,data.sourceDate);
    if (todayDetails) data.todayDetails = todayDetails;
  }
  return data;
}

async function getForecast(city, withTodayDetails=false) {
  if (typeof city!=='string'||!city.trim()||city.length>60||/[\x00-\x1f<>/\\?:#]/.test(city)) throw new Error('请输入有效城市名称');
  city=city.trim();
  const key=(withTodayDetails ? 'today|' : 'forecast|')+city;
  const saved=cache.get(key);
  if(saved&&Date.now()-saved.at<(saved.error?60000:TTL)&&saved.date===beijingDate()) {
    if(saved.error)throw new Error(saved.error);
    return saved.data;
  }
  if(pending.has(key))return pending.get(key);
  if(pending.size>=8)throw new Error('天气查询繁忙，请稍后再试');
  const job=collect(city,withTodayDetails).then(data=>{cache.set(key,{at:Date.now(),date:beijingDate(),data});return data;}).catch(error=>{cache.set(key,{at:Date.now(),date:beijingDate(),error:error.message});throw error;}).finally(()=>{pending.delete(key);if(cache.size>64)cache.delete(cache.keys().next().value);});
  pending.set(key,job);return job;
}

exports.main=async event=>{
  const method=event?.httpMethod||'GET';
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  if(method!=='GET')return {statusCode:405,headers,body:JSON.stringify({error:'只支持GET查询'})};
  const query=event?.queryStringParameters||event?.queryString||{};
  try {return {statusCode:200,headers,body:JSON.stringify(await getForecast(query.city||'上海',query.details==='today'))};}
  catch(error){return {statusCode:503,headers,body:JSON.stringify({source:'moji',error:error.message})};}
};
exports.parseForecast=parseForecast;
exports.getForecast=getForecast;
