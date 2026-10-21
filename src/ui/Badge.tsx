import { useState } from 'react';

export default function Badge({ onStart }: { onStart: (name: string) => void }) {
  const [name, setName] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(name.trim() || 'You');
  };
  return (
    <form className="badge" onSubmit={submit} aria-label="Artisan badge">
      <div className="badge-house">Atelier Holey</div>
      <label className="badge-line" htmlFor="artisan">
        Hand-distressed by
      </label>
      <input
        id="artisan"
        className="badge-input"
        value={name}
        maxLength={18}
        placeholder="You"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <button className="btn btn-primary" type="submit">
        Start distressing
      </button>
    </form>
  );
}
