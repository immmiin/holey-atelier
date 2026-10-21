export default function About({ onClose }: { onClose: () => void }) {
  return (
    <div className="about-scrim" onClick={onClose}>
      <aside className="about" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(e) => e.stopPropagation()}>
        <button className="about-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 id="about-title">Less sock, higher price.</h2>
        <p>
          Holey sells one sock with a hole. At the Atelier you finish it yourself: pull the loose thread and the sock unravels,
          row by row, into a heap on the floor. The less sock there is, the more it costs. Your wage stays at $0.00.
        </p>
        <h3>References</h3>
        <ul>
          <li>
            Balenciaga, <em>Paris</em> “Fully Destroyed” sneakers: $1,850, limited to 100 pairs.
          </li>
          <li>
            The IKEA effect: people value what they build themselves more (Norton, Mochon &amp; Ariely, 2012). Holey flips it: you
            destroy it, and pay more.
          </li>
        </ul>
        <h3>Credits</h3>
        <p>
          Concept, design &amp; code: Minjeong Shin (immmiin), SVA BFA Graphic Design.
          <br />
          Product imagery visualized with AI; all interaction, unravel effects and yarn rendered in code.
        </p>
        <p className="about-fine">Communication Arts 2027 Interactive Competition · Student Work</p>
      </aside>
    </div>
  );
}
