// Figures d'étirement (SVG). Style commun via la classe .fig (voir index.css).
const FIGURES = {
  wrists: (
    <>
      <line className="fig__ground" x1="24" y1="162" x2="216" y2="162" />
      <path className="fig__limb" d="M70 152 L105 106" />
      <path className="fig__limb" d="M105 106 L166 106" />
      <path className="fig__limb" d="M166 106 L182 156" />
      <circle className="fig__head" cx="59" cy="112" r="13" />
      <path className="fig__hint" d="M70 152 L86 152" />
      <path className="fig__hint" d="M182 156 L166 156" />
    </>
  ),
  cobra: (
    <>
      <line className="fig__ground" x1="24" y1="162" x2="216" y2="162" />
      <path className="fig__limb" d="M186 158 L120 152" />
      <path className="fig__limb" d="M120 152 Q96 150 82 120" />
      <path className="fig__limb" d="M72 158 L81 121" />
      <circle className="fig__head" cx="68" cy="109" r="12" />
    </>
  ),
  pec: (
    <>
      <line className="fig__ground" x1="24" y1="162" x2="216" y2="162" />
      <line className="fig__prop" x1="182" y1="34" x2="182" y2="160" />
      <circle className="fig__head" cx="106" cy="52" r="13" />
      <path className="fig__limb" d="M106 65 L112 122" />
      <path className="fig__limb" d="M112 122 L101 160" />
      <path className="fig__limb" d="M112 122 L125 160" />
      <path className="fig__limb" d="M110 82 L158 92" />
      <path className="fig__limb" d="M158 92 L168 56" />
    </>
  ),
  triceps: (
    <>
      <line className="fig__ground" x1="24" y1="162" x2="216" y2="162" />
      <circle className="fig__head" cx="118" cy="52" r="13" />
      <path className="fig__limb" d="M118 65 L118 122" />
      <path className="fig__limb" d="M118 122 L107 160" />
      <path className="fig__limb" d="M118 122 L129 160" />
      <path className="fig__limb" d="M118 76 L134 34" />
      <path className="fig__limb" d="M134 34 L112 66" />
      <path className="fig__limb" d="M118 76 L130 40" />
    </>
  ),
  shoulder: (
    <>
      <line className="fig__ground" x1="24" y1="162" x2="216" y2="162" />
      <circle className="fig__head" cx="118" cy="52" r="13" />
      <path className="fig__limb" d="M118 65 L118 122" />
      <path className="fig__limb" d="M118 122 L107 160" />
      <path className="fig__limb" d="M118 122 L129 160" />
      <path className="fig__limb" d="M108 78 L158 98" />
      <path className="fig__limb" d="M130 78 L141 94 L120 99" />
    </>
  ),
  child: (
    <>
      <line className="fig__ground" x1="24" y1="162" x2="216" y2="162" />
      <path className="fig__limb" d="M156 150 L184 158" />
      <path className="fig__limb" d="M156 150 L98 151" />
      <path className="fig__limb" d="M98 151 L57 158" />
      <circle className="fig__head" cx="90" cy="149" r="12" />
    </>
  ),
  twist: (
    <>
      <line className="fig__ground" x1="24" y1="162" x2="216" y2="162" />
      <circle className="fig__head" cx="118" cy="52" r="13" />
      <path className="fig__limb" d="M118 65 L118 122" />
      <path className="fig__limb" d="M118 122 L107 160" />
      <path className="fig__limb" d="M118 122 L129 160" />
      <path className="fig__limb" d="M118 78 L74 86" />
      <path className="fig__limb" d="M118 78 L164 66" />
      <path className="fig__hint" d="M96 44 Q118 30 140 44" />
      <path className="fig__hint" d="M140 44 L133 38 M140 44 L133 50" />
    </>
  ),
}

export default function StretchFigure({ id }) {
  return (
    <svg className="fig" viewBox="0 0 240 180" role="img" aria-label={id}>
      {FIGURES[id] || null}
    </svg>
  )
}
