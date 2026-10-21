/** 預設主視覺：塞納河左岸的抽象插畫（後台可以換成照片） */
export function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1600 700" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="河岸邊的咖啡館與山丘插畫">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe2cd" />
          <stop offset="1" stopColor="#f6eee2" />
        </linearGradient>
        <linearGradient id="river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6cf9f" />
          <stop offset="1" stopColor="#ddbe78" />
        </linearGradient>
      </defs>
      <rect width="1600" height="700" fill="url(#sky)" />
      <circle cx="1190" cy="235" r="112" fill="#ddaa61" opacity="0.85" />
      <g fill="none" stroke="#6b443d" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <path d="M420 170l14 10 14-10" />
        <path d="M468 140l10 7 10-7" />
        <path d="M980 120l12 8 12-8" />
      </g>
      {/* 遠山 */}
      <path d="M0 400 C 180 320 320 300 470 345 S 760 300 900 330 S 1200 280 1360 320 S 1540 330 1600 310 V700 H0Z" fill="#ced4b8" />
      {/* 中景丘陵 */}
      <path d="M0 450 C 160 400 300 410 430 430 S 700 380 860 410 S 1150 400 1300 380 S 1520 400 1600 390 V700 H0Z" fill="#849671" />
      {/* 河 */}
      <path d="M0 520 C 300 470 520 500 760 480 S 1240 450 1600 470 V700 H0Z" fill="url(#river)" />
      <g fill="none" stroke="#f7f1e8" strokeWidth="4" strokeLinecap="round" opacity="0.8">
        <path d="M760 545 c 40 -10 80 -10 120 0" />
        <path d="M1010 515 c 50 -10 90 -10 140 0" />
        <path d="M1240 560 c 40 -8 80 -8 120 0" />
        <path d="M860 610 c 50 -10 100 -10 150 0" />
      </g>
      {/* 右岸 */}
      <path d="M1100 700 C 1250 640 1420 620 1600 615 V700Z" fill="#bc924c" opacity="0.7" />
      {/* 左岸 */}
      <path d="M0 470 C 160 470 330 500 470 560 S 640 660 720 700 H0Z" fill="#5c6f5d" />
      <path d="M0 560 C 140 560 300 600 420 660 L 470 700 H0Z" fill="#224228" opacity="0.9" />
      {/* 咖啡館 */}
      <g transform="translate(200 395)">
        <rect x="0" y="40" width="150" height="110" fill="#6b443d" />
        <path d="M-12 40 L75 -10 L162 40Z" fill="#39221e" />
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={-6 + i * 32.4} y="64" width="16.2" height="18" fill={i % 2 ? "#f7f1e8" : "#af751b"} />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={`b${i}`} x={10.2 + i * 32.4} y="64" width="16.2" height="18" fill={i % 2 ? "#af751b" : "#f7f1e8"} />
          ))}
        </g>
        <rect x="20" y="96" width="34" height="54" fill="#ddbe78" />
        <rect x="88" y="96" width="40" height="30" fill="#ddbe78" />
        <rect x="88" y="96" width="40" height="30" fill="none" stroke="#39221e" strokeWidth="3" />
      </g>
      {/* 樹 */}
      <g>
        <rect x="402" y="430" width="8" height="70" fill="#39221e" />
        <circle cx="406" cy="420" r="42" fill="#224228" />
        <rect x="96" y="440" width="7" height="60" fill="#39221e" />
        <circle cx="99" cy="430" r="34" fill="#224228" opacity="0.92" />
      </g>
      {/* 咖啡桌與兩張椅子：對話 */}
      <g transform="translate(470 545)" fill="#39221e">
        <rect x="-3" y="0" width="6" height="34" />
        <ellipse cx="0" cy="0" rx="26" ry="6" />
        <rect x="-50" y="12" width="5" height="24" />
        <rect x="-58" y="8" width="20" height="5" />
        <rect x="45" y="12" width="5" height="24" />
        <rect x="38" y="8" width="20" height="5" />
      </g>
    </svg>
  );
}
