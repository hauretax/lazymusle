// Grille d'un programme à calendrier : des groupes en lignes (les 3 niveaux des
// pompes, les 9 semaines de la course), une case par séance.
//
// L'état d'une case vient de l'historique (`lib/progress`), jamais du curseur —
// c'est tout l'enjeu de T7 : un jour sauté doit rester gris.
//
// Sans `onSelect`, la grille est un simple tableau de bord (écran Progression).
export default function PlanGrid({ groups, selected, onSelect }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.id} className="lvl">
          <div className="lvl__head">
            <span className="lvl__name">{g.name}</span>
            {g.meta && <span className="lvl__meta">{g.meta}</span>}
          </div>
          <div className="lvl__cells">
            {g.cells.map((c) => {
              const cls = [
                'cell',
                c.done && 'cell--done',
                c.tried && 'cell--tried',
                c.isTest && 'cell--test',
                c.current && 'cell--cur',
                onSelect && 'cell--tap',
                onSelect && selected === c.key && 'cell--sel',
              ].filter(Boolean).join(' ')
              const label = c.done ? '✓' : c.isTest ? '★' : c.label
              if (!onSelect) {
                return <span key={c.key} className={cls}>{label}</span>
              }
              return (
                <button
                  key={c.key}
                  type="button"
                  className={cls}
                  aria-label={c.aria}
                  aria-pressed={selected === c.key}
                  onClick={() => onSelect(c.key)}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

export function PlanLegend({ tried }) {
  return (
    <ul className="legend">
      <li className="legend__item"><span className="cell cell--done">✓</span> validée</li>
      <li className="legend__item"><span className="cell">·</span> pas faite</li>
      <li className="legend__item"><span className="cell cell--cur">·</span> proposée</li>
      {tried && <li className="legend__item"><span className="cell cell--test cell--tried">★</span> test tenté</li>}
    </ul>
  )
}
