/** 預設主視覺：黃昏時分的塞納河左岸咖啡館（後台可以換成照片）。色調偏暗，讓上面的白字清楚。 */
export function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1600 760" preserveAspectRatio="xMinYMid slice" className={className} role="img" aria-label="黃昏時河岸邊亮著燈的咖啡館">
      <defs>
        <linearGradient id="dusk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a211c" />
          <stop offset="0.65" stopColor="#5a4130" />
          <stop offset="1" stopColor="#7a5636" />
        </linearGradient>
        <linearGradient id="dusk-river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c5a35" />
          <stop offset="1" stopColor="#4a3524" />
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ddbe78" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ddbe78" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="760" fill="url(#dusk-sky)" />
      <rect y="600" width="1600" height="160" fill="#3f2d1f" />
      <g transform="translate(0 -170)">
      <circle cx="1180" cy="400" r="120" fill="#c98f45" opacity="0.55" />
      {/* 遠山、中景 */}
      <path d="M0 420 C 180 350 320 330 470 370 S 760 330 900 355 S 1200 310 1360 345 S 1540 355 1600 335 V940 H0Z" fill="#4b4434" />
      <path d="M0 470 C 160 425 300 435 430 455 S 700 410 860 435 S 1150 425 1300 405 S 1520 425 1600 415 V940 H0Z" fill="#363a2c" />
      {/* 河 */}
      <path d="M0 545 C 300 495 520 525 760 505 S 1240 475 1600 495 V940 H0Z" fill="url(#dusk-river)" />
      <g fill="none" stroke="#ddbe78" strokeWidth="3" strokeLinecap="round" opacity="0.45">
        <path d="M760 570 c 40 -8 80 -8 120 0" />
        <path d="M1010 540 c 50 -8 90 -8 140 0" />
        <path d="M1240 585 c 40 -6 80 -6 120 0" />
        <path d="M300 640 c 50 -8 100 -8 150 0" />
      </g>
      {/* 左岸 */}
      <path d="M0 495 C 160 495 330 525 470 585 S 640 685 720 760 L 760 940 H0Z" fill="#262b20" />
      <path d="M0 590 C 140 590 300 630 420 690 L 470 760 L 500 940 H0Z" fill="#1b1f17" />
      {/* 咖啡館，窗內亮燈 */}
      <ellipse cx="275" cy="500" rx="190" ry="120" fill="url(#glow)" />
      <g transform="translate(200 420)">
        <rect x="0" y="40" width="150" height="110" fill="#4a2f29" />
        <path d="M-12 40 L75 -10 L162 40Z" fill="#241612" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <rect key={i} x={-6 + i * 16.2} y="64" width="16.2" height="16" fill={i % 2 ? "#e9dcc0" : "#8f5f22"} />
        ))}
        <rect x="20" y="96" width="34" height="54" fill="#e7c77f" />
        <rect x="88" y="96" width="40" height="30" fill="#e7c77f" />
        <rect x="88" y="96" width="40" height="30" fill="none" stroke="#241612" strokeWidth="3" />
      </g>
      {/* 樹 */}
      <rect x="402" y="455" width="8" height="70" fill="#151510" />
      <circle cx="406" cy="445" r="42" fill="#1f2a1c" />
      <rect x="96" y="465" width="7" height="60" fill="#151510" />
      <circle cx="99" cy="455" r="34" fill="#1f2a1c" />
      {/* 咖啡桌與兩張椅子：對話 */}
      <g transform="translate(470 570)" fill="#120d0b">
        <rect x="-3" y="0" width="6" height="34" />
        <ellipse cx="0" cy="0" rx="26" ry="6" />
        <rect x="-50" y="12" width="5" height="24" />
        <rect x="-58" y="8" width="20" height="5" />
        <rect x="45" y="12" width="5" height="24" />
        <rect x="38" y="8" width="20" height="5" />
      </g>
      </g>
    </svg>
  );
}
