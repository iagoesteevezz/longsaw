/**
 * Página de privacidad en lenguaje claro. Debe mantenerse sincronizada con el
 * comportamiento real del código (ver docs/ARCHITECTURE.md §Privacidad).
 */
import { ThemeToggle } from '../components/ThemeToggle';
import { LangToggle } from '../components/LangToggle';
import { useT } from '../lib/i18n';

const COLORS = ['bg-card-green', 'bg-card-yellow', 'bg-card-blue', 'bg-card-pink', 'bg-card-lavender', 'bg-card-stone'];

export function PrivacyPage({ onBack }: { onBack: () => void }) {
  const t = useT();
  return (
    <main className="mx-auto max-w-xl px-5 pb-16 pt-8">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="rounded-full bg-surface px-4 py-2 text-sm font-bold">{t.common.back}</button>
        <span className="flex gap-2">
          <LangToggle variant="solid" />
          <ThemeToggle variant="solid" />
        </span>
      </div>
      <h1 className="mt-6 text-5xl font-extrabold leading-none">{t.privacy.title}</h1>

      {t.privacy.blocks.map(([title, body], i) => (
        <Block key={title} color={COLORS[i]} title={title}>
          {body}
        </Block>
      ))}
    </main>
  );
}

function Block({ color, title, children }: { color: string; title: string; children: React.ReactNode }) {
  return (
    <section className={`mt-5 rounded-[2rem] ${color} p-6`}>
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="mt-2 font-semibold leading-snug opacity-85">{children}</p>
    </section>
  );
}
