// Bonshommes bâtons des exercices de détente (T18), même trait que les
// étirements (classes .fig). Chaque exercice a DEUX positions — départ et
// arrivée — qui alternent : c'est un mouvement, une image fixe ne le dirait pas.
// Avec « réduire les animations », les deux positions restent visibles, le
// départ en fantôme.
const step = <path className="fig__prop" d="M36 162 L36 140 L132 140 L132 162" />
const ground = <line className="fig__ground" x1="24" y1="162" x2="216" y2="162" />

const FIGURES = {
  // Quart de squat, puis détente verticale bras en haut.
  leap: {
    a: (
      <>
        <circle className="fig__head" cx="130" cy="56" r="13" />
        <path className="fig__limb" d="M126 70 L112 112" />
        <path className="fig__limb" d="M112 112 L134 132 L118 160" />
        <path className="fig__limb" d="M112 112 L126 138 L108 160" />
        <path className="fig__limb" d="M124 76 L100 102" />
      </>
    ),
    b: (
      <>
        <circle className="fig__head" cx="120" cy="26" r="13" />
        <path className="fig__limb" d="M120 40 L120 95" />
        <path className="fig__limb" d="M120 95 L114 142" />
        <path className="fig__limb" d="M120 95 L126 142" />
        <path className="fig__limb" d="M120 48 L94 26" />
        <path className="fig__limb" d="M120 48 L146 26" />
        <path className="fig__hint" d="M104 152 L112 152 M128 152 L136 152" />
      </>
    ),
  },
  // Sur une jambe, pointe au bord de la marche : talon bas, puis talon haut.
  calf: {
    prop: step,
    a: (
      <>
        <circle className="fig__head" cx="140" cy="30" r="13" />
        <path className="fig__limb" d="M140 43 L140 98" />
        <path className="fig__limb" d="M140 98 L146 146 L128 140" />
        <path className="fig__limb" d="M140 98 L152 122 L166 120" />
        <path className="fig__limb" d="M140 56 L118 74" />
      </>
    ),
    b: (
      <>
        <circle className="fig__head" cx="140" cy="16" r="13" />
        <path className="fig__limb" d="M140 29 L140 84" />
        <path className="fig__limb" d="M140 84 L140 128 L128 140" />
        <path className="fig__limb" d="M140 84 L152 108 L166 106" />
        <path className="fig__limb" d="M140 42 L118 60" />
      </>
    ),
  },
  // Un pied sur le banc, poussée, changement de jambe en l'air.
  step: {
    prop: <path className="fig__prop" d="M136 162 L136 120 L204 120 L204 162" />,
    a: (
      <>
        <circle className="fig__head" cx="123" cy="30" r="13" />
        <path className="fig__limb" d="M122 44 L120 98" />
        <path className="fig__limb" d="M120 98 L114 160" />
        <path className="fig__limb" d="M120 98 L148 100 L146 120" />
        <path className="fig__limb" d="M122 56 L104 80" />
      </>
    ),
    b: (
      <>
        <circle className="fig__head" cx="160" cy="16" r="13" />
        <path className="fig__limb" d="M160 30 L158 76" />
        <path className="fig__limb" d="M158 76 L152 114" />
        <path className="fig__limb" d="M158 76 L180 86 L176 106" />
        <path className="fig__limb" d="M160 40 L182 24" />
      </>
    ),
  },
  // Genoux verrouillés, petits sauts sur les mollets.
  thrust: {
    a: (
      <>
        <circle className="fig__head" cx="120" cy="30" r="13" />
        <path className="fig__limb" d="M120 44 L120 98" />
        <path className="fig__limb" d="M120 98 L116 152 L106 160" />
        <path className="fig__limb" d="M120 98 L124 152 L114 160" />
        <path className="fig__limb" d="M120 56 L112 94" />
        <path className="fig__limb" d="M120 56 L128 94" />
      </>
    ),
    b: (
      <>
        <circle className="fig__head" cx="120" cy="14" r="13" />
        <path className="fig__limb" d="M120 28 L120 82" />
        <path className="fig__limb" d="M120 82 L116 136 L106 144" />
        <path className="fig__limb" d="M120 82 L124 136 L114 144" />
        <path className="fig__limb" d="M120 40 L112 78" />
        <path className="fig__limb" d="M120 40 L128 78" />
        <path className="fig__hint" d="M100 154 L108 154 M118 154 L126 154" />
      </>
    ),
  },
  // Deux pieds sur la marche, tout petits mouvements très rapides.
  burnout: {
    prop: step,
    fast: true,
    a: (
      <>
        <circle className="fig__head" cx="140" cy="26" r="13" />
        <path className="fig__limb" d="M140 39 L140 94" />
        <path className="fig__limb" d="M140 94 L136 140 L124 140" />
        <path className="fig__limb" d="M140 94 L146 140 L130 140" />
        <path className="fig__limb" d="M140 52 L118 70" />
      </>
    ),
    b: (
      <>
        <circle className="fig__head" cx="140" cy="20" r="13" />
        <path className="fig__limb" d="M140 33 L140 88" />
        <path className="fig__limb" d="M140 88 L136 134 L124 140" />
        <path className="fig__limb" d="M140 88 L146 134 L130 140" />
        <path className="fig__limb" d="M140 46 L118 64" />
        <path className="fig__hint" d="M176 60 L176 100 M170 68 L176 60 L182 68 M170 92 L176 100 L182 92" />
      </>
    ),
  },
}

export default function JumpFigure({ id }) {
  const f = FIGURES[id]
  if (!f) return null
  return (
    <svg className={'fig jfig' + (f.fast ? ' jfig--fast' : '')} viewBox="0 0 240 180" role="img" aria-label={id}>
      {ground}
      {f.prop}
      <g className="jfig__a">{f.a}</g>
      <g className="jfig__b">{f.b}</g>
    </svg>
  )
}
