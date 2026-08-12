"use strict";

window.DailyRadioComponents = (() => {
  const iconPaths = {
    wave: "<path d='M4 13v-2m4 6V7m4 13V4m4 12V8m4 6v-4'/>",
    home: "<path d='M3.5 11.5 12 4l8.5 7.5'/><path d='M5.5 10.5V20h13v-9.5M9.5 20v-6h5v6'/>",
    grid: "<rect x='4' y='4' width='6' height='6' rx='1'/><rect x='14' y='4' width='6' height='6' rx='1'/><rect x='4' y='14' width='6' height='6' rx='1'/><rect x='14' y='14' width='6' height='6' rx='1'/>",
    heart: "<path d='M20.8 8.8c0 5.3-8.8 10.2-8.8 10.2S3.2 14.1 3.2 8.8A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.4Z'/>",
    user: "<circle cx='12' cy='8' r='3.5'/><path d='M5 20c.7-4 3-6 7-6s6.3 2 7 6'/>",
    chart: "<rect x='3.5' y='4' width='17' height='16' rx='2.5'/><path d='M7 16v-4m4 4V8m4 8v-6m4 6v-9'/>",
    trend: "<path d='m4 17 5-5 3.5 3.5L20 7'/><path d='M15 7h5v5'/>",
    bot: "<rect x='4' y='7' width='16' height='12' rx='4'/><path d='M12 7V4M8 12h.01M16 12h.01M8 16h8'/>",
    cross: "<path d='M10.5 3.5h3V9H19v3h-5.5v8.5h-3V12H5V9h5.5z'/>",
    trophy: "<path d='M8 4h8v5c0 3-1.8 5-4 5s-4-2-4-5zM12 14v4M8 21h8M9 18h6'/><path d='M8 6H4v2c0 2 1.4 3 4 3M16 6h4v2c0 2-1.4 3-4 3'/>",
    play: "<path d='m9 6 9 6-9 6z' fill='currentColor' stroke='none'/>",
    pause: "<path d='M8 6v12M16 6v12' stroke-width='2.5'/>",
    file: "<path d='M6 3.5h8l4 4V20H6z'/><path d='M14 3.5V8h4M9 12h6M9 15.5h6'/>",
    spark: "<path d='m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4z'/><path d='m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z'/>",
    more: "<circle cx='6' cy='12' r='1' fill='currentColor' stroke='none'/><circle cx='12' cy='12' r='1' fill='currentColor' stroke='none'/><circle cx='18' cy='12' r='1' fill='currentColor' stroke='none'/>",
    search: "<circle cx='10.5' cy='10.5' r='6.5'/><path d='m15.5 15.5 5 5'/>",
    sun: "<circle cx='12' cy='12' r='3.5'/><path d='M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4'/>",
    moon: "<path d='M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z'/>",
    chevron: "<path d='m9 5 7 7-7 7'/>",
    check: "<path d='m5 12 4 4L19 6'/>",
    close: "<path d='m6 6 12 12M18 6 6 18'/>",
    clock: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/>",
    volume: "<path d='M4 10h4l5-4v12l-5-4H4zM16 9c1.5 1.5 1.5 4.5 0 6M19 6c3 3 3 9 0 12'/>",
    bookmark: "<path d='M7 4h10v16l-5-3-5 3z'/>",
    up: "<path d='m6 15 6-6 6 6'/>",
    down: "<path d='m6 9 6 6 6-6'/>",
    drag: "<circle cx='9' cy='6' r='1' fill='currentColor' stroke='none'/><circle cx='15' cy='6' r='1' fill='currentColor' stroke='none'/><circle cx='9' cy='12' r='1' fill='currentColor' stroke='none'/><circle cx='15' cy='12' r='1' fill='currentColor' stroke='none'/><circle cx='9' cy='18' r='1' fill='currentColor' stroke='none'/><circle cx='15' cy='18' r='1' fill='currentColor' stroke='none'/>",
    plus: "<path d='M12 5v14M5 12h14'/>",
    refresh: "<path d='M20 8v5h-5M4 16v-5h5'/><path d='M18.5 10A7 7 0 0 0 6 7l-2 4M5.5 14A7 7 0 0 0 18 17l2-4'/>",
    headphones: "<path d='M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z'/>",
    bell: "<path d='M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20h4'/>",
    login: "<path d='M10 5H5v14h5M14 8l4 4-4 4M18 12H9'/>",
    trash: "<path d='M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5'/>",
    info: "<circle cx='12' cy='12' r='9'/><path d='M12 11v6M12 7h.01'/>",
    sliders: "<path d='M4 7h10M18 7h2M4 17h2M10 17h10'/><circle cx='16' cy='7' r='2'/><circle cx='8' cy='17' r='2'/>",
    portfolio: "<rect x='4' y='7' width='16' height='12' rx='2'/><path d='M9 7V5h6v2M4 12h16M10 12v2h4v-2'/>",
    star: "<path d='m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9z'/>",
    calendar: "<rect x='3.5' y='5.5' width='17' height='15' rx='2.5'/><path d='M8 3v5M16 3v5M3.5 10h17'/>",
    arrow: "<path d='M5 12h14M14 7l5 5-5 5'/>",
    radio: "<circle cx='12' cy='12' r='2'/><path d='M8 8a5.7 5.7 0 0 0 0 8M16 8a5.7 5.7 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14'/>",
    leaf: "<path d='M19 4C10 4 5 9 5 15c0 3 2 5 5 5 6 0 9-7 9-16Z'/><path d='M5 20c2-5 5-8 10-11'/>",
    flag: "<path d='M6 21V4M6 5h11l-2 4 2 4H6'/>",
    shield: "<path d='M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'/><path d='m9 12 2 2 4-5'/>",
    history: "<path d='M4 5v5h5'/><path d='M5.5 9a8 8 0 1 1-1 6M12 8v5l3 2'/>",
    send: "<path d='m3 11 18-8-7 18-3-7zM11 14 21 3'/>",
    text: "<path d='M5 6h14M12 6v13M8 19h8'/>",
    speed: "<path d='M5 17a8 8 0 1 1 14 0M12 13l4-4'/>",
    layers: "<path d='m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5'/>",
    eye: "<path d='M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z'/><circle cx='12' cy='12' r='2.5'/>",
    eyeOff: "<path d='m4 4 16 16M10.7 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.1 2.7M6.4 6.4C3.9 8.2 2.5 12 2.5 12s3.5 6 9.5 6c1 0 1.9-.2 2.7-.4M10.4 10.4a2.5 2.5 0 0 0 3.2 3.2'/>",
    grip: "<path d='M8 6h8M8 12h8M8 18h8'/>",
    mic: "<rect x='8' y='3' width='8' height='12' rx='4'/><path d='M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8'/>",
    wallet: "<path d='M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6z'/><path d='M2 7V5a2 2 0 0 1 2-2h12M15 11h5v4h-5a2 2 0 0 1 0-4z'/>",
    edit: "<path d='M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4'/>",
    external: "<path d='M14 4h6v6M20 4l-9 9'/><path d='M18 13v6H5V6h6'/>",
    list: "<path d='M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01'/>",
    cast: "<path d='M4 18h.01M4 13a5 5 0 0 1 5 5M4 8a10 10 0 0 1 10 10M6 4h14v14h-2'/>",
    download: "<path d='M12 3v12M7 10l5 5 5-5M5 20h14'/>",
    menu: "<path d='M4 7h16M4 12h16M4 17h16'/>",
    lock: "<rect x='5' y='10' width='14' height='11' rx='2'/><path d='M8 10V7a4 4 0 0 1 8 0v3'/>",
    settings: "<circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1z'/>",
    logoutDoor: "<path d='M10 4H5v16h5M15 8l4 4-4 4M19 12H9'/>",
    share: "<circle cx='18' cy='5' r='2'/><circle cx='6' cy='12' r='2'/><circle cx='18' cy='19' r='2'/><path d='m8 11 8-5M8 13l8 5'/>",
    copy: "<rect x='8' y='8' width='12' height='12' rx='2'/><path d='M16 8V4H4v12h4'/>",
    playCircle: "<circle cx='12' cy='12' r='9'/><path d='m10 8 6 4-6 4z' fill='currentColor' stroke='none'/>",
    filter: "<path d='M4 5h16l-6 7v6l-4 2v-8z'/>",
    inbox: "<path d='M4 4h16v14H4z'/><path d='M4 14h5l2 2h2l2-2h5'/>",
    help: "<circle cx='12' cy='12' r='9'/><path d='M9.8 9a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1.2 1-1.2 1.8M12 17h.01'/>",
    checkCircle: "<circle cx='12' cy='12' r='9'/><path d='m8 12 3 3 5-6'/>",
    warning: "<path d='M12 3 2.5 20h19z'/><path d='M12 9v5M12 17h.01'/>",
    cloud: "<path d='M7 18a4 4 0 0 1-1-7.9A6 6 0 0 1 17.5 8a5 5 0 0 1 .5 10z'/>",
    globe: "<circle cx='12' cy='12' r='9'/><path d='M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18'/>",
    dots: "<circle cx='5' cy='12' r='1' fill='currentColor' stroke='none'/><circle cx='12' cy='12' r='1' fill='currentColor' stroke='none'/><circle cx='19' cy='12' r='1' fill='currentColor' stroke='none'/>",
    quote: "<path d='M7 10h3v7H5v-5c0-4 2-6 5-7M16 10h3v7h-5v-5c0-4 2-6 5-7'/>",
    archive: "<path d='M4 7h16v13H4zM3 4h18v3H3zM9 11h6'/>",
    mail: "<rect x='3' y='5' width='18' height='14' rx='2'/><path d='m4 7 8 6 8-6'/>",
    pin: "<path d='m9 4 6 6M7 12l5 5M14 3l7 7-4 2-5 5-5-5 5-5zM7 17l-4 4'/>",
    music: "<path d='M9 18V6l10-2v12M9 10l10-2'/><circle cx='6' cy='18' r='3'/><circle cx='16' cy='16' r='3'/>",
    headset: "<path d='M4 15v-3a8 8 0 0 1 16 0v3M4 15h4v6H6a2 2 0 0 1-2-2zM20 15h-4v6h2a2 2 0 0 0 2-2z'/>",
    rewind: "<path d='M11 7 5 12l6 5zM19 7l-6 5 6 5z'/>",
    forward: "<path d='m13 7 6 5-6 5zM5 7l6 5-6 5z'/>",
    maximize: "<path d='M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5'/>",
    minimize: "<path d='M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5'/>",
    wifi: "<path d='M4 10a12 12 0 0 1 16 0M7 13a8 8 0 0 1 10 0M10 16a4 4 0 0 1 4 0M12 20h.01'/>",
    signal: "<path d='M5 19v-3M10 19v-7M15 19V8M20 19V4'/>",
    battery: "<rect x='3' y='7' width='17' height='10' rx='2'/><path d='M22 10v4'/>",
    sort: "<path d='M8 5v14M5 8l3-3 3 3M16 19V5M13 16l3 3 3-3'/>",
    coffee: "<path d='M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h2a2 2 0 0 1 0 4h-2M7 4v2M11 3v3M15 4v2'/>",
    feather: "<path d='M20 4C12 4 6 10 5 19c5 0 11-3 15-15Z'/><path d='M5 20c4-5 7-8 12-12'/>",
    globe2: "<circle cx='12' cy='12' r='9'/><path d='M3 12h18M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9z'/>",
    tag: "<path d='M3 12V4h8l10 10-7 7z'/><circle cx='7.5' cy='8.5' r='1'/>",
    phone: "<rect x='7' y='2' width='10' height='20' rx='2'/><path d='M10 5h4M11 19h2'/>",
    monitor: "<rect x='3' y='4' width='18' height='13' rx='2'/><path d='M8 21h8M12 17v4'/>",
    back: "<path d='m15 18-6-6 6-6'/>",
    next: "<path d='m9 18 6-6-6-6'/>",
    location: "<path d='M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z'/><circle cx='12' cy='10' r='2.5'/>",
    shuffle: "<path d='M4 7h3c4 0 6 10 10 10h3M17 14l3 3-3 3M4 17h3c1.5 0 2.7-1.2 3.8-2.8M14 9.8C15 8.2 16 7 17 7h3M17 4l3 3-3 3'/>",
    repeat: "<path d='M17 4l3 3-3 3M20 7H7a4 4 0 0 0-4 4M7 20l-3-3 3-3M4 17h13a4 4 0 0 0 4-4'/>",
    stop: "<rect x='7' y='7' width='10' height='10' rx='1' fill='currentColor' stroke='none'/>",
    dotCircle: "<circle cx='12' cy='12' r='9'/><circle cx='12' cy='12' r='3' fill='currentColor' stroke='none'/>",
    swap: "<path d='M7 7h12l-3-3M17 17H5l3 3'/>",
    undo: "<path d='M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6'/>",
    upload: "<path d='M12 16V4M7 9l5-5 5 5M5 20h14'/>",
    downloadCloud: "<path d='M8 18H6a4 4 0 0 1-.5-8A6 6 0 0 1 17 8a5 5 0 0 1 1 10h-2M12 11v10M8 17l4 4 4-4'/>",
    verify: "<path d='m12 3 8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'/><path d='m8 12 3 3 5-6'/>",
    timer: "<circle cx='12' cy='13' r='8'/><path d='M9 2h6M12 5V2M12 13l3-3'/>",
    ellipsis: "<circle cx='6' cy='12' r='1.3' fill='currentColor' stroke='none'/><circle cx='12' cy='12' r='1.3' fill='currentColor' stroke='none'/><circle cx='18' cy='12' r='1.3' fill='currentColor' stroke='none'/>",
    caretDown: "<path d='m7 9 5 5 5-5'/>",
    dot: "<circle cx='12' cy='12' r='3' fill='currentColor' stroke='none'/>",
    key: "<circle cx='8' cy='15' r='4'/><path d='m11 12 9-9M16 7l2 2M14 9l2 2'/>",
    mobile: "<rect x='7' y='2.5' width='10' height='19' rx='2'/><path d='M10 5h4M11 19h2'/>",
    desktop: "<rect x='3' y='4' width='18' height='13' rx='2'/><path d='M8 21h8M12 17v4'/>",
    code: "<path d='m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16'/>",
    bulb: "<path d='M9 18h6M10 21h4M8 15a7 7 0 1 1 8 0c-1 .8-1 1.5-1 3H9c0-1.5 0-2.2-1-3Z'/>",
    playList: "<path d='M4 6h10M4 11h10M4 16h7'/><path d='m16 14 5 3-5 3z' fill='currentColor' stroke='none'/>",
    folder: "<path d='M3 6h7l2 2h9v11H3z'/>",
    logout2: "<path d='M10 4H4v16h6M15 8l4 4-4 4M19 12H9'/>",
    data: "<ellipse cx='12' cy='5' rx='8' ry='3'/><path d='M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7'/>",
    accessibility: "<circle cx='12' cy='4.5' r='2'/><path d='M4 8h16M12 7v14M8 21l4-7 4 7'/>",
    language: "<circle cx='12' cy='12' r='9'/><path d='M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9z'/>",
    compact: "<path d='M5 7h14M5 12h14M5 17h14'/>",
    expand: "<path d='M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5'/>",
    equalizer: "<path d='M5 19V9M12 19V5M19 19v-7'/><circle cx='5' cy='7' r='2'/><circle cx='12' cy='13' r='2'/><circle cx='19' cy='9' r='2'/>",
    audio: "<path d='M5 10h4l5-4v12l-5-4H5zM17 9a5 5 0 0 1 0 6M20 6a9 9 0 0 1 0 12'/>",
    article: "<path d='M5 3h14v18H5zM8 7h8M8 11h8M8 15h5'/>",
    favorite: "<path d='m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9z'/>",
    channel: "<circle cx='12' cy='12' r='2'/><path d='M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14'/>",
    profile: "<circle cx='12' cy='8' r='3.5'/><path d='M5 20c.7-4 3-6 7-6s6.3 2 7 6'/>",
    today: "<rect x='3.5' y='5.5' width='17' height='15' rx='2.5'/><path d='M8 3v5M16 3v5M3.5 10h17M8 14h2M14 14h2'/>",
    voice: "<rect x='8' y='3' width='8' height='12' rx='4'/><path d='M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8'/>",
    time: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/>",
    appearance: "<path d='M12 3a9 9 0 1 0 9 9c0-1.2-.2-2.3-.7-3.3A5.5 5.5 0 0 1 12 3Z'/>",
    reset: "<path d='M4 5v5h5'/><path d='M5.5 9a8 8 0 1 1-1 6'/>",
    holdings: "<rect x='4' y='7' width='16' height='12' rx='2'/><path d='M9 7V5h6v2M4 12h16'/>",
    watch: "<path d='m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9z'/>",
    removeCircle: "<circle cx='12' cy='12' r='9'/><path d='m9 9 6 6M15 9l-6 6'/>",
    addCircle: "<circle cx='12' cy='12' r='9'/><path d='M12 8v8M8 12h8'/>",
    transcript: "<path d='M5 4h14v16H5zM8 8h8M8 12h8M8 16h5'/>",
    importance: "<path d='M12 3 2.5 20h19z'/><path d='M12 9v5M12 17h.01'/>",
    source: "<path d='M7 4h10v4H7zM5 8h14v12H5zM8 12h8M8 16h5'/>",
    date: "<rect x='3.5' y='5.5' width='17' height='15' rx='2'/><path d='M8 3v5M16 3v5M3.5 10h17'/>",
    duration: "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/>",
    channelIcon: "<circle cx='12' cy='12' r='2'/><path d='M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8'/>",
    save: "<path d='M5 4h12l2 2v14H5zM8 4v6h7V4M8 20v-6h8v6'/>",
    done: "<path d='m5 12 4 4L19 6'/>",
    clear: "<path d='m6 6 12 12M18 6 6 18'/>",
    dragDots: "<circle cx='9' cy='6' r='1' fill='currentColor' stroke='none'/><circle cx='15' cy='6' r='1' fill='currentColor' stroke='none'/><circle cx='9' cy='12' r='1' fill='currentColor' stroke='none'/><circle cx='15' cy='12' r='1' fill='currentColor' stroke='none'/><circle cx='9' cy='18' r='1' fill='currentColor' stroke='none'/><circle cx='15' cy='18' r='1' fill='currentColor' stroke='none'/>",
    mini: "<path d='M5 12h3m3 0h3m3 0h2M6.5 9v6M12.5 6v12M18 9v6'/>",
    logo: "<path d='M4 13v-2m4 6V7m4 13V4m4 12V8m4 6v-4'/>",
    theme: "<circle cx='12' cy='12' r='3.5'/><path d='M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4'/>",
    notification: "<path d='M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20h4'/>",
    overflow: "<circle cx='6' cy='12' r='1.2' fill='currentColor' stroke='none'/><circle cx='12' cy='12' r='1.2' fill='currentColor' stroke='none'/><circle cx='18' cy='12' r='1.2' fill='currentColor' stroke='none'/>",
    listen: "<path d='M4 15v-3a8 8 0 0 1 16 0v3M4 15h4v6H6a2 2 0 0 1-2-2zM20 15h-4v6h2a2 2 0 0 0 2-2z'/>",
    focus: "<path d='m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z'/>",
    reorder: "<path d='M8 5v14M5 8l3-3 3 3M16 19V5M13 16l3 3 3-3'/>",
    calendarClock: "<rect x='3.5' y='5.5' width='17' height='15' rx='2'/><path d='M8 3v5M16 3v5M3.5 10h9'/><circle cx='16' cy='16' r='4'/><path d='M16 14v2l1.5 1'/>",
    shieldCheck: "<path d='M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'/><path d='m8 12 3 3 5-6'/>",
    stock: "<path d='M4 18 9 12l4 3 7-9'/><path d='M15 6h5v5'/>",
    finance: "<rect x='3.5' y='4' width='17' height='16' rx='2.5'/><path d='M7 16v-4m4 4V8m4 8v-6m4 6v-9'/>",
    ai: "<rect x='4' y='7' width='16' height='12' rx='4'/><path d='M12 7V4M8 12h.01M16 12h.01M8 16h8'/>",
    faith: "<path d='M10.5 3.5h3V9H19v3h-5.5v8.5h-3V12H5V9h5.5z'/>",
    sports: "<path d='M8 4h8v5c0 3-1.8 5-4 5s-4-2-4-5zM12 14v4M8 21h8M9 18h6'/><path d='M8 6H4v2c0 2 1.4 3 4 3M16 6h4v2c0 2-1.4 3-4 3'/>",
    open: "<path d='M14 4h6v6M20 4l-9 9'/><path d='M18 13v6H5V6h6'/>",
    quote2: "<path d='M7 10h3v7H5v-5c0-4 2-6 5-7M16 10h3v7h-5v-5c0-4 2-6 5-7'/>",
    chevronDown: "<path d='m6 9 6 6 6-6'/>",
    chevronUp: "<path d='m6 15 6-6 6 6'/>",
    speaker: "<path d='M4 10h4l5-4v12l-5-4H4zM16 9c1.5 1.5 1.5 4.5 0 6M19 6c3 3 3 9 0 12'/>",
    person: "<circle cx='12' cy='8' r='3.5'/><path d='M5 20c.7-4 3-6 7-6s6.3 2 7 6'/>",
    selector: "<path d='m8 9 4-4 4 4M8 15l4 4 4-4'/>",
    hide: "<path d='m4 4 16 16M10.7 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-2.1 2.7M6.4 6.4C3.9 8.2 2.5 12 2.5 12s3.5 6 9.5 6c1 0 1.9-.2 2.7-.4M10.4 10.4a2.5 2.5 0 0 0 3.2 3.2'/>"
  };

  const navItems = [
    { id: "today", label: "今日电台", icon: "home" },
    { id: "channels", label: "我的频道", icon: "grid" },
    { id: "favorites", label: "收藏", icon: "heart" },
    { id: "profile", label: "我的", icon: "user" }
  ];

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }

  function icon(name, className = "") {
    return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.wave}</svg>`;
  }

  function channelMeta(id, channels) {
    return channels.find(channel => channel.id === id) || channels[0];
  }

  function logo() {
    return `<div class="brand-mark" aria-label="每日简讯电台">${icon("wave")}</div>`;
  }

  function desktopHeader(state) {
    return `
      <header class="desktop-header glass-surface">
        <nav aria-label="主导航">
          ${navItems.map(item => `
            <button class="top-nav-item ${state.view === item.id ? "is-active" : ""}" type="button" data-view="${item.id}" aria-current="${state.view === item.id ? "page" : "false"}">
              ${escapeHtml(item.label)}
            </button>
          `).join("")}
        </nav>
        <div class="header-actions">
          <span class="demo-badge">演示数据</span>
          <button class="icon-button" type="button" data-action="theme-toggle" aria-label="切换${state.theme === "dark" ? "浅色" : "夜间"}模式">${icon(state.theme === "dark" ? "sun" : "moon")}</button>
          <button class="avatar-button" type="button" data-view="profile" aria-label="打开我的设置">${icon("user")}</button>
        </div>
      </header>`;
  }

  function mobileHeader(state, greeting, dateText) {
    return `
      <header class="mobile-header">
        <div>
          <p>${escapeHtml(dateText)}</p>
          <strong class="mobile-greeting-title">${escapeHtml(greeting)}</strong>
        </div>
        <div class="mobile-header-actions">
          <span class="mobile-demo-dot" title="演示数据">DEMO</span>
          <button class="icon-button" type="button" data-action="theme-toggle" aria-label="切换主题">${icon(state.theme === "dark" ? "sun" : "moon")}</button>
          <button class="icon-button" type="button" data-action="open-settings" aria-label="更多设置">${icon("more")}</button>
        </div>
      </header>`;
  }

  function channelRail(state, channels) {
    return `
      <aside class="channel-rail" aria-label="我的频道">
        ${logo()}
        <div class="rail-heading">
          <p>我的频道</p>
          <button class="text-button" type="button" data-view="channels">管理</button>
        </div>
        <div class="rail-list">
          ${channels.map(channel => {
            const selected = state.selectedChannels.includes(channel.id);
            return `
              <button class="rail-channel ${selected ? "is-selected" : ""}" type="button" data-action="toggle-channel" data-channel="${channel.id}" aria-pressed="${selected}">
                <span class="channel-icon channel-${channel.id}">${icon(channel.icon)}</span>
                <span>${escapeHtml(channel.name)}</span>
                <span class="rail-check">${selected ? icon("check") : ""}</span>
              </button>`;
          }).join("")}
        </div>
        <button class="invite-card" type="button" data-action="share">
          <span>${icon("headphones")}</span>
          <strong>邀请好友</strong>
          <small>一起收听每日简报</small>
          ${icon("arrow")}
        </button>
      </aside>`;
  }

  function mobileChannelTabs(state, channels) {
    return `
      <div class="mobile-channel-tabs" role="tablist" aria-label="频道筛选">
        ${channels.map(channel => {
          const selected = state.selectedChannels.includes(channel.id);
          return `<button class="channel-pill ${selected ? "is-selected" : ""}" type="button" data-action="toggle-channel" data-channel="${channel.id}" role="tab" aria-selected="${selected}">${escapeHtml(channel.name)}</button>`;
        }).join("")}
      </div>`;
  }

  function waveform(progress = 0, count = 52, compact = false) {
    const normalized = Math.max(0, Math.min(1, progress));
    return `<div class="waveform ${compact ? "is-compact" : ""}" aria-hidden="true" data-waveform>
      ${Array.from({ length: count }, (_, index) => {
        const height = 22 + ((index * 17 + index * index * 7) % 74);
        const active = index / count <= normalized;
        return `<i class="${active ? "is-active" : ""}" style="--bar-height:${height}%"></i>`;
      }).join("")}
    </div>`;
  }

  function mainPlayer(state, current, channels, summary) {
    const channel = channelMeta(current.channel, channels);
    const percent = Math.round(state.progress * 100);
    return `
      <section class="main-player" aria-label="今日简报主播放器">
        <div class="player-glow" aria-hidden="true"><span></span></div>
        <div class="player-copy">
          <span class="player-kicker"><i></i>${escapeHtml(channel.name)} · 今日已更新</span>
          <h1>${escapeHtml(summary.greeting)}</h1>
          <p class="player-lead">你的今日简报已经生成</p>
          <p class="player-meta">${summary.count} 条最新简讯 <b>·</b> 预计 ${summary.duration}</p>
        </div>
        <div class="player-wave" aria-label="播放进度 ${percent}%" data-progress-label>
          ${waveform(state.progress)}
        </div>
        <div class="player-controls">
          <button class="primary-play" type="button" data-action="play-toggle" aria-label="${state.playing ? "暂停" : "播放"}今日简报">${icon(state.playing ? "pause" : "play")}</button>
          <button class="control-chip ${state.focusOnly ? "is-selected" : ""}" type="button" data-action="focus-toggle" aria-pressed="${state.focusOnly}">${icon("spark")}只听重点</button>
          <button class="control-chip" type="button" data-action="speed-toggle" aria-label="调整播放速度">${state.speed.toFixed(1)}×</button>
          <button class="control-chip" type="button" data-action="open-transcript">${icon("file")}文字稿</button>
        </div>
        <div class="current-line">
          <span>${escapeHtml(channel.name)} · ${escapeHtml(current.title)}</span>
          <span data-progress-percent>${percent}%</span>
        </div>
      </section>`;
  }

  function briefingCard(briefing, state, channels, layout = "card") {
    const channel = channelMeta(briefing.channel, channels);
    const favorite = state.favorites.includes(briefing.id);
    return `
      <article class="brief-card brief-${layout}" data-brief-id="${briefing.id}">
        <div class="brief-card-top">
          <span class="brief-channel channel-${briefing.channel}">${icon(channel.icon)}${escapeHtml(channel.name)}</span>
          <span class="importance importance-${briefing.importance === "重要" ? "high" : "normal"}">${escapeHtml(briefing.importance)}</span>
        </div>
        <button class="brief-main" type="button" data-action="open-brief" data-id="${briefing.id}">
          <span class="brief-copy">
            <strong>${escapeHtml(briefing.title)}</strong>
            <span>${escapeHtml(briefing.summary)}</span>
          </span>
          <span class="brief-art channel-${briefing.channel}" aria-hidden="true">${icon(channel.icon)}</span>
        </button>
        <div class="brief-footer">
          <span>${escapeHtml(briefing.source)} · ${escapeHtml(briefing.updatedAt)}</span>
          <div>
            <span>${escapeHtml(briefing.duration)}</span>
            <button type="button" data-action="favorite" data-id="${briefing.id}" aria-label="${favorite ? "取消收藏" : "收藏"}${escapeHtml(briefing.title)}" aria-pressed="${favorite}">${icon(favorite ? "bookmark" : "heart")}</button>
            <button type="button" data-action="play-item" data-id="${briefing.id}" aria-label="播放${escapeHtml(briefing.title)}">${icon(state.currentId === briefing.id && state.playing ? "pause" : "play")}</button>
          </div>
        </div>
      </article>`;
  }

  function playlist(state, playlist, channels) {
    return `
      <aside class="playlist-panel" aria-label="今日听单">
        <div class="section-heading compact-heading">
          <div><h2>今日听单</h2><p>${playlist.length} 条 · 可拖动排序</p></div>
          <button class="icon-button" type="button" data-view="channels" aria-label="自定义听单">${icon("sliders")}</button>
        </div>
        <ol class="playlist" data-playlist>
          ${playlist.map((item, index) => {
            const channel = channelMeta(item.channel, channels);
            const active = item.id === state.currentId;
            return `<li class="playlist-item ${active ? "is-active" : ""}" draggable="true" tabindex="0" aria-label="${escapeHtml(item.title)}，按 Alt 加上方向键或下方向键调整顺序" data-id="${item.id}" data-index="${index}">
              <button class="playlist-play" type="button" data-action="play-item" data-id="${item.id}" aria-label="播放${escapeHtml(item.title)}">${icon(active && state.playing ? "pause" : channel.icon)}</button>
              <button class="playlist-copy" type="button" data-action="play-item" data-id="${item.id}">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(channel.name)} · ${escapeHtml(item.duration)}</span>
              </button>
              <div class="move-controls" aria-label="调整顺序">
                <button type="button" data-action="move-item" data-id="${item.id}" data-direction="-1" aria-label="上移" ${index === 0 ? "disabled" : ""}>${icon("up")}</button>
                <button type="button" data-action="move-item" data-id="${item.id}" data-direction="1" aria-label="下移" ${index === playlist.length - 1 ? "disabled" : ""}>${icon("down")}</button>
              </div>
              <span class="drag-handle" title="拖动排序">${icon("drag")}</span>
            </li>`;
          }).join("")}
        </ol>
        <button class="customize-button" type="button" data-view="channels">${icon("plus")} 自定义听单</button>
      </aside>`;
  }

  function miniPlayer(state, current, channels) {
    const channel = channelMeta(current.channel, channels);
    return `
      <div class="mini-player glass-surface" aria-label="迷你播放器">
        <span class="mini-player-icon channel-${current.channel}">${icon("wave")}</span>
        <button class="mini-copy" type="button" data-action="open-transcript">
          <strong>${escapeHtml(current.title)}</strong>
          <span>${escapeHtml(channel.name)} · <b data-progress-percent>${Math.round(state.progress * 100)}%</b></span>
        </button>
        <div class="mini-wave">${waveform(state.progress, 18, true)}</div>
        <button class="icon-button" type="button" data-action="play-toggle" aria-label="${state.playing ? "暂停" : "播放"}">${icon(state.playing ? "pause" : "play")}</button>
        <button class="icon-button mini-list-button" type="button" data-action="open-playlist" aria-label="打开听单">${icon("list")}</button>
      </div>`;
  }

  function bottomNav(state) {
    return `
      <nav class="bottom-nav" aria-label="移动端主导航">
        ${navItems.map(item => `
          <button class="bottom-nav-item ${state.view === item.id ? "is-active" : ""}" type="button" data-view="${item.id}" aria-current="${state.view === item.id ? "page" : "false"}">
            ${icon(item.icon)}<span>${escapeHtml(item.label)}</span>
          </button>
        `).join("")}
      </nav>`;
  }

  function todayView(state, data, filtered, current, summary) {
    const highlights = filtered.slice(0, 4);
    return `
      <div class="today-shell">
        ${channelRail(state, data.channels)}
        <main class="today-main">
          ${mobileHeader(state, summary.greeting, summary.dateText)}
          ${mobileChannelTabs(state, data.channels)}
          ${mainPlayer(state, current, data.channels, summary)}
          <section class="highlights" aria-labelledby="highlights-heading">
            <div class="section-heading">
              <div><h2 id="highlights-heading">今日重点</h2><p>为你筛选的高价值信息</p></div>
              <button class="text-button" type="button" data-action="focus-toggle">${state.focusOnly ? "查看全部" : "只看重点"}${icon("chevron")}</button>
            </div>
            <div class="highlight-grid">
              ${highlights.map(item => briefingCard(item, state, data.channels)).join("")}
            </div>
          </section>
        </main>
        ${playlist(state, filtered, data.channels)}
      </div>`;
  }

  function channelsView(state, data, filtered) {
    return `
      <main class="secondary-view">
        ${mobileHeader(state, "我的频道", "让每天的声音更合你心意")}
        <div class="secondary-title">
          <span class="title-icon">${icon("grid")}</span>
          <div><h1>我的频道</h1><p>选择、隐藏或调整频道顺序。更改会立即影响今日听单。</p></div>
        </div>
        <section class="settings-section channel-manager">
          <div class="settings-heading"><h2>已配置频道</h2><span>${state.selectedChannels.length} / ${data.channels.length}</span></div>
          <div class="manager-list">
            ${data.channels.map((channel, index) => {
              const selected = state.selectedChannels.includes(channel.id);
              return `<div class="manager-item ${selected ? "is-selected" : ""}">
                <span class="channel-icon channel-${channel.id}">${icon(channel.icon)}</span>
                <div><strong>${escapeHtml(channel.name)}</strong><small>${escapeHtml(channel.hint)}</small></div>
                <button class="visibility-button" type="button" data-action="toggle-channel" data-channel="${channel.id}" aria-pressed="${selected}">${icon(selected ? "eye" : "eyeOff")}<span>${selected ? "显示中" : "已隐藏"}</span></button>
                <span class="manager-order">${String(index + 1).padStart(2, "0")}</span>
              </div>`;
            }).join("")}
          </div>
        </section>
        <section class="settings-section stock-manager">
          <div class="settings-heading"><div><h2>A 股关注范围</h2><p>仅用于生成个股频道的模拟简讯。</p></div></div>
          <div class="stock-columns">
            ${stockList("自选股", "watchlist", state.watchlist)}
            ${stockList("持仓股", "holdings", state.holdings)}
          </div>
          <form class="stock-add-form" data-form="stock-add">
            <label><span>股票代码或名称</span><input name="stock" autocomplete="off" placeholder="例如：600519 或 贵州茅台" maxlength="20"></label>
            <label><span>加入到</span><select name="stockType"><option value="watchlist">自选股</option><option value="holdings">持仓股</option></select></label>
            <button class="primary-button" type="submit">${icon("plus")}添加</button>
          </form>
        </section>
        <div class="secondary-list-preview">
          <div class="section-heading"><div><h2>当前听单</h2><p>${filtered.length} 条模拟简讯</p></div></div>
          ${filtered.slice(0, 3).map(item => briefingCard(item, state, data.channels, "row")).join("")}
        </div>
      </main>`;
  }

  function stockList(title, type, stocks) {
    return `<div class="stock-list"><div><strong>${title}</strong><span>${stocks.length} 只</span></div>${stocks.length ? stocks.map(stock => `<span class="stock-chip">${escapeHtml(stock)}<button type="button" data-action="remove-stock" data-type="${type}" data-value="${escapeHtml(stock)}" aria-label="移除${escapeHtml(stock)}">${icon("close")}</button></span>`).join("") : "<p>尚未添加</p>"}</div>`;
  }

  function favoritesView(state, data) {
    const favorites = data.briefings.filter(item => state.favorites.includes(item.id));
    return `
      <main class="secondary-view favorites-view">
        ${mobileHeader(state, "收藏", "把值得回听的内容留在这里")}
        <div class="secondary-title">
          <span class="title-icon">${icon("heart")}</span>
          <div><h1>我的收藏</h1><p>你保存的重点简讯，可随时继续收听或查看文字稿。</p></div>
        </div>
        ${favorites.length ? `<div class="favorites-grid">${favorites.map(item => briefingCard(item, state, data.channels, "row")).join("")}</div>` : `
          <div class="empty-state">
            <span>${icon("bookmark")}</span>
            <h2>还没有收藏</h2>
            <p>在今日简讯卡片中点击收藏按钮，重要内容会出现在这里。</p>
            <button class="primary-button" type="button" data-view="today">去听今日简报</button>
          </div>`}
      </main>`;
  }

  function profileView(state) {
    return `
      <main class="secondary-view profile-view">
        ${mobileHeader(state, "我的", "你的收听偏好都保存在本机")}
        <div class="secondary-title profile-title">
          <span class="profile-avatar">${icon("user")}</span>
          <div><h1>早上好</h1><p>每日简讯电台 · 本地演示账户</p></div>
          <span class="local-badge">本地保存</span>
        </div>
        <section class="settings-section profile-settings">
          <div class="settings-heading"><h2>收听偏好</h2><button class="text-button" type="button" data-action="restart-onboarding">重新设置</button></div>
          <div class="preference-row"><span>${icon("clock")}</span><div><strong>每日收听时长</strong><small>控制个性化听单长度</small></div><b>${state.listenMinutes} 分钟</b></div>
          <div class="preference-row"><span>${icon("mic")}</span><div><strong>播报声音</strong><small>优先播放 Edge TTS 自然语音</small></div><b>${escapeHtml(state.voice)}</b></div>
          <div class="preference-row"><span>${icon("calendarClock")}</span><div><strong>简报更新时间</strong><small>演示提醒设置</small></div><b>${escapeHtml(state.updateTime)}</b></div>
          <div class="preference-row"><span>${icon("appearance")}</span><div><strong>夜间收听模式</strong><small>降低夜间界面亮度</small></div><button class="toggle ${state.theme === "dark" ? "is-on" : ""}" type="button" data-action="theme-toggle" aria-pressed="${state.theme === "dark"}"><i></i></button></div>
        </section>
        <section class="settings-section privacy-section">
          <div class="settings-heading"><h2>关于本演示</h2></div>
          <div class="notice-row">${icon("shieldCheck")}<p><strong>不连接真实账户</strong><span>频道、收藏、自选股和设置仅保存在当前浏览器。</span></p></div>
          <div class="notice-row">${icon("info")}<p><strong>全部内容均为演示数据</strong><span>财经和个股内容不构成投资建议。</span></p></div>
          <button class="danger-button" type="button" data-action="reset-demo">${icon("refresh")}重置全部演示数据</button>
        </section>
      </main>`;
  }

  function onboarding(state, channels) {
    if (state.onboardingComplete) return "";
    const step = state.onboardingStep;
    const stockSelected = state.draftChannels.includes("stocks");
    const finalStep = stockSelected ? 3 : 2;
    const canContinue = step === 1 ? state.draftChannels.length > 0 : true;
    return `
      <div class="modal-backdrop">
        <section class="onboarding glass-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <div class="onboarding-progress" aria-label="第 ${step} 步，共 ${finalStep} 步">${Array.from({ length: finalStep }, (_, index) => `<i class="${index + 1 <= step ? "is-active" : ""}"></i>`).join("")}</div>
          ${step === 1 ? onboardingChannels(state, channels) : step === 2 ? onboardingPreferences(state) : onboardingStocks(state)}
          <div class="onboarding-actions">
            ${step > 1 ? `<button class="secondary-button" type="button" data-action="onboarding-back">返回</button>` : ""}
            <button class="continue-button" type="button" data-action="onboarding-next" ${canContinue ? "" : "disabled"}>${step === finalStep ? "生成今日听单" : "继续"}${icon("arrow")}</button>
          </div>
        </section>
      </div>`;
  }

  function onboardingChannels(state, channels) {
    return `
      <div class="onboarding-heading">
        <span class="onboarding-mark">${icon("wave")}</span>
        <h1 id="onboarding-title">今天，你想听些什么？</h1>
        <p>选择感兴趣的频道，我们会为你生成一份专属的每日简报。</p>
      </div>
      <div class="onboarding-channel-grid">
        ${channels.map(channel => {
          const selected = state.draftChannels.includes(channel.id);
          return `<button class="onboarding-channel ${selected ? "is-selected" : ""}" type="button" data-action="onboarding-channel" data-channel="${channel.id}" aria-pressed="${selected}">
            <span class="channel-icon channel-${channel.id}">${icon(channel.icon)}</span>
            <strong>${escapeHtml(channel.name)}</strong>
            <small>${escapeHtml(channel.hint)}</small>
            <i class="onboarding-check">${selected ? icon("check") : ""}</i>
          </button>`;
        }).join("")}
      </div>
      <p class="onboarding-note">至少选择一个频道，之后可以随时调整。</p>`;
  }

  function onboardingPreferences(state) {
    const durations = [5, 10, 15];
    const voices = ["HsiaoChen｜女声"];
    return `
      <div class="onboarding-heading">
        <span class="onboarding-mark">${icon("sliders")}</span>
        <h1 id="onboarding-title">调成你的收听节奏</h1>
        <p>我们会按照时长和声音偏好安排每天的听单。</p>
      </div>
      <fieldset class="choice-field"><legend>希望每日简报的收听时长</legend><div class="segmented-choice">${durations.map(value => `<button class="${state.draftListenMinutes === value ? "is-selected" : ""}" type="button" data-action="duration-choice" data-value="${value}">${value} 分钟</button>`).join("")}</div></fieldset>
      <fieldset class="choice-field"><legend>播报声音</legend><div class="voice-choice">${voices.map(voice => `<button class="${state.draftVoice === voice ? "is-selected" : ""}" type="button" data-action="voice-choice" data-value="${voice}"><span>${icon("feather")}</span><strong>${voice}</strong><small>自然、亲切的中文女声</small></button>`).join("")}</div></fieldset>
      <label class="time-choice"><span><b>每日更新时间</b><small>提醒仅作界面演示</small></span><input type="time" value="${escapeHtml(state.draftUpdateTime)}" data-action="time-choice"></label>`;
  }

  function onboardingStocks(state) {
    return `
      <div class="onboarding-heading">
        <span class="onboarding-mark">${icon("trend")}</span>
        <h1 id="onboarding-title">添加你关注的 A 股</h1>
        <p>个股简讯会结合你的自选股和持仓股生成。现在也可以跳过。</p>
      </div>
      <form class="onboarding-stock-form" data-form="onboarding-stock">
        <input name="stock" autocomplete="off" aria-label="股票代码或名称" placeholder="输入股票代码或名称" maxlength="20">
        <select name="stockType" aria-label="选择股票分组"><option value="watchlist">自选股</option><option value="holdings">持仓股</option></select>
        <button type="submit" aria-label="添加股票">${icon("plus")}</button>
      </form>
      <div class="stock-columns onboarding-stock-columns">
        ${stockList("自选股", "watchlist", state.draftWatchlist)}
        ${stockList("持仓股", "holdings", state.draftHoldings)}
      </div>
      <p class="onboarding-note">本演示不会请求或保存真实持仓数量。</p>`;
  }

  function detailDrawer(state, briefing, channels, isPlaylist = false) {
    if (!state.drawerOpen) return "";
    if (isPlaylist) {
      return `<div class="drawer-backdrop" data-action="close-drawer"><section class="detail-drawer glass-dialog playlist-drawer" role="dialog" aria-modal="true" aria-label="今日听单" data-drawer-content><div class="drawer-handle"></div><div class="drawer-heading"><div><h2>今日听单</h2><p>拖动桌面听单，或使用顺序按钮调整</p></div><button class="icon-button" type="button" data-action="close-drawer" aria-label="关闭">${icon("close")}</button></div><p class="drawer-tip">移动端完整排序功能请在“我的频道”中使用。</p></section></div>`;
    }
    if (!briefing) return "";
    const channel = channelMeta(briefing.channel, channels);
    const favorite = state.favorites.includes(briefing.id);
    const drawerPercent = state.currentId === briefing.id ? Math.round(state.progress * 100) : 0;
    const transcriptParagraphs = String(briefing.transcript || "")
      .replace(/\s+/g, " ")
      .replace(/\s*(?=(?:核心变化|当前判断|市场表现|公司更新|研读逻辑|压力观察|支撑观察)：|以上内容来自正式网页今日个股研读)/g, "\n")
      .split(/\n+/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean);
    return `
      <div class="drawer-backdrop" data-action="close-drawer">
        <section class="detail-drawer glass-dialog" role="dialog" aria-modal="true" aria-labelledby="drawer-title" data-drawer-content data-drawer-brief-id="${briefing.id}">
          <div class="drawer-handle"></div>
          <div class="drawer-heading">
            <span class="brief-channel channel-${briefing.channel}">${icon(channel.icon)}${escapeHtml(channel.name)}</span>
            <button class="icon-button" type="button" data-action="close-drawer" aria-label="关闭详情">${icon("close")}</button>
          </div>
          <p class="drawer-meta">${escapeHtml(briefing.updatedAt)} 更新 · ${escapeHtml(briefing.duration)} · ${escapeHtml(briefing.importance)}</p>
          <h2 id="drawer-title">${escapeHtml(briefing.title)}</h2>
          <p class="drawer-summary">${escapeHtml(briefing.summary)}</p>
          <div class="drawer-playback-controls" aria-label="播放控制">
            <div class="drawer-actions">
              <button class="primary-button" type="button" data-action="play-item" data-id="${briefing.id}">${icon(state.currentId === briefing.id && state.playing ? "pause" : "play")}${state.currentId === briefing.id && state.playing ? "暂停" : "播放简讯"}</button>
              <button class="secondary-button drawer-next-button" type="button" data-action="next-brief" data-id="${briefing.id}">${icon("chevron")}下一条</button>
              <button class="secondary-button" type="button" data-action="favorite" data-id="${briefing.id}">${icon(favorite ? "bookmark" : "heart")}${favorite ? "已收藏" : "收藏"}</button>
            </div>
            <div class="drawer-progress-row">
              <span>播放进度</span>
              <strong data-drawer-progress-percent>${drawerPercent}%</strong>
            </div>
            <div class="drawer-progress" data-drawer-progress data-id="${briefing.id}" role="progressbar" aria-label="播放进度 ${drawerPercent}%" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${drawerPercent}">
              <span data-progress-fill style="--progress:${drawerPercent}%"></span>
            </div>
          </div>
          <div class="transcript-block"><span>${icon("quote")}</span><div class="transcript-copy">${transcriptParagraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div></div>
          <p class="drawer-source">信息来源：${escapeHtml(briefing.source)}${briefing.sourceUrl ? ` · <a href="${escapeHtml(briefing.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看原文</a>` : ""}</p>
        </section>
      </div>`;
  }

  function shell(state, data, filtered, current, summary) {
    const content = state.view === "today"
      ? todayView(state, data, filtered, current, summary)
      : state.view === "channels"
        ? channelsView(state, data, filtered)
        : state.view === "favorites"
          ? favoritesView(state, data)
          : profileView(state);
    const drawerBrief = data.briefings.find(item => item.id === state.drawerId);
    const overlayActive = !state.onboardingComplete || state.drawerOpen;
    return `
      <div class="app-shell theme-${state.theme}">
        <div class="ambient-orb orb-one" aria-hidden="true"></div><div class="ambient-orb orb-two" aria-hidden="true"></div>
        <div class="app-content" ${overlayActive ? "inert aria-hidden=\"true\"" : ""}>
          <div class="page-frame">
            ${desktopHeader(state)}
            ${content}
          </div>
          ${current ? miniPlayer(state, current, data.channels) : ""}
          ${bottomNav(state)}
        </div>
        ${onboarding(state, data.channels)}
        ${detailDrawer(state, drawerBrief, data.channels, state.drawerId === "playlist")}
        <div class="toast ${state.toast ? "is-visible" : ""}" role="status">${escapeHtml(state.toast)}</div>
      </div>`;
  }

  return { shell, icon, escapeHtml };
})();
