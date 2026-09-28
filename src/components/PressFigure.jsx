// Bonshommes bâtons du press (T17), de profil, même trait et même animation que
// la détente (JumpFigure) : départ et arrivée alternent.
const ground = <line className="fig__ground" x1="24" y1="162" x2="216" y2="162" />

// Handstand de profil, mains en (x, 160). Réutilisé en arrivée de tous les press.
const handstand = (x) => (
  <>
    <path className="fig__limb" d={`M${x} 160 L${x} 118`} />
    <circle className="fig__head" cx={x + 12} cy="128" r="12" />
    <path className="fig__limb" d={`M${x} 118 L${x} 76`} />
    <path className="fig__limb" d={`M${x} 76 L${x} 30`} />
  </>
)

// L-sit : mains au sol, bras tendus, jambes à l'horizontale devant.
const lsit = (
  <>
    <path className="fig__limb" d="M120 160 L120 116" />
    <circle className="fig__head" cx="124" cy="100" r="12" />
    <path className="fig__limb" d="M120 116 L116 146" />
    <path className="fig__limb" d="M116 146 L176 146" />
  </>
)

// Assis jambes tendues, pour la compression.
const legs = <path className="fig__limb" d="M100 154 L178 154" />

const FIGURES = {
  // Handstand dos au mur, jambes qui descendent lentement, hanches au-dessus des mains.
  'wall-neg': {
    prop: <line className="fig__prop" x1="168" y1="10" x2="168" y2="162" />,
    a: <>{handstand(148)}</>,
    b: (
      <>
        <path className="fig__limb" d="M148 160 L144 118" />
        <circle className="fig__head" cx="130" cy="128" r="12" />
        <path className="fig__limb" d="M144 118 L150 76" />
        <path className="fig__limb" d="M150 76 L104 124" />
        <path className="fig__hint" d="M120 40 Q96 56 92 90 M86 82 L92 90 L99 84" />
      </>
    ),
  },
  // Mains sur des blocs, pieds au sol : les épaules avancent, les pieds décollent.
  elevated: {
    prop: <path className="fig__prop" d="M120 162 L120 142 L152 142 L152 162" />,
    a: (
      <>
        <path className="fig__limb" d="M84 160 L112 100" />
        <path className="fig__limb" d="M112 100 L142 108" />
        <circle className="fig__head" cx="152" cy="120" r="12" />
        <path className="fig__limb" d="M142 108 L136 142" />
      </>
    ),
    b: (
      <>
        <path className="fig__limb" d="M136 142 L136 102" />
        <circle className="fig__head" cx="148" cy="112" r="12" />
        <path className="fig__limb" d="M136 102 L136 62" />
        <path className="fig__limb" d="M136 62 L136 18" />
      </>
    ),
  },
  // Debout, mains au sol : épaules en avant, hanches au-dessus des mains, jambes qui suivent.
  standing: {
    a: (
      <>
        <path className="fig__limb" d="M88 160 L112 96" />
        <path className="fig__limb" d="M112 96 L136 120" />
        <circle className="fig__head" cx="146" cy="132" r="12" />
        <path className="fig__limb" d="M136 120 L132 160" />
      </>
    ),
    b: <>{handstand(132)}</>,
  },
  'l-straddle': { a: lsit, b: <>{handstand(120)}</> },
  'l-pike': { a: lsit, b: <>{handstand(120)}</> },

  // Compression : bras tendus, mains posées sur les jambes, les abdos tirent le buste.
  knees: {
    a: (
      <>
        {legs}
        <path className="fig__limb" d="M100 154 L104 108" />
        <circle className="fig__head" cx="106" cy="94" r="12" />
        <path className="fig__limb" d="M104 116 L138 150" />
      </>
    ),
    b: (
      <>
        {legs}
        <path className="fig__limb" d="M100 154 L128 118" />
        <circle className="fig__head" cx="138" cy="106" r="12" />
        <path className="fig__limb" d="M124 124 L140 150" />
      </>
    ),
  },
  shins: {
    a: (
      <>
        {legs}
        <path className="fig__limb" d="M100 154 L110 110" />
        <circle className="fig__head" cx="114" cy="96" r="12" />
        <path className="fig__limb" d="M110 118 L154 150" />
      </>
    ),
    b: (
      <>
        {legs}
        <path className="fig__limb" d="M100 154 L134 122" />
        <circle className="fig__head" cx="146" cy="112" r="12" />
        <path className="fig__limb" d="M130 127 L156 150" />
      </>
    ),
  },
  toes: {
    a: (
      <>
        {legs}
        <path className="fig__limb" d="M100 154 L118 112" />
        <circle className="fig__head" cx="124" cy="100" r="12" />
        <path className="fig__limb" d="M116 120 L174 150" />
      </>
    ),
    b: (
      <>
        {legs}
        <path className="fig__limb" d="M100 154 L140 128" />
        <circle className="fig__head" cx="153" cy="120" r="12" />
        <path className="fig__limb" d="M136 132 L174 150" />
      </>
    ),
  },
  // Mains au sol à côté des hanches : les talons décollent, genoux verrouillés.
  'pike-lifts': {
    a: (
      <>
        {legs}
        <path className="fig__limb" d="M100 154 L98 108" />
        <circle className="fig__head" cx="100" cy="94" r="12" />
        <path className="fig__limb" d="M98 116 L92 158" />
      </>
    ),
    b: (
      <>
        <path className="fig__limb" d="M100 154 L174 132" />
        <path className="fig__limb" d="M100 154 L98 108" />
        <circle className="fig__head" cx="100" cy="94" r="12" />
        <path className="fig__limb" d="M98 116 L92 158" />
        <path className="fig__hint" d="M184 150 L184 128 M178 136 L184 128 L190 136" />
      </>
    ),
  },
  // Pareil, mains plus loin devant : moins de levier, il faut compresser plus fort.
  'pike-lifts-fwd': {
    a: (
      <>
        {legs}
        <path className="fig__limb" d="M100 154 L112 110" />
        <circle className="fig__head" cx="118" cy="98" r="12" />
        <path className="fig__limb" d="M110 118 L134 158" />
      </>
    ),
    b: (
      <>
        <path className="fig__limb" d="M100 154 L174 136" />
        <path className="fig__limb" d="M100 154 L112 110" />
        <circle className="fig__head" cx="118" cy="98" r="12" />
        <path className="fig__limb" d="M110 118 L134 158" />
        <path className="fig__hint" d="M184 150 L184 132 M178 140 L184 132 L190 140" />
      </>
    ),
  },
}

export default function PressFigure({ id }) {
  const f = FIGURES[id]
  if (!f) return null
  return (
    <svg className="fig jfig" viewBox="0 0 240 180" role="img" aria-label={id}>
      {ground}
      {f.prop}
      <g className="jfig__a">{f.a}</g>
      <g className="jfig__b">{f.b}</g>
    </svg>
  )
}
