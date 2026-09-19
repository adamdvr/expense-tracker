import { Hourglass } from 'lucide-react'

/** Заглушка раздела, который ещё не реализован. Заголовок страницы рисует AppShell — здесь только пояснение. */
export function SectionPlaceholder({ description }: { description: string }) {
  return (
    <section className="flex max-w-3xl items-center gap-5 rounded-2xl bg-muted p-6 sm:p-8">
      <span
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-periwinkle text-foreground"
      >
        <Hourglass className="size-5" />
      </span>
      <div>
        <h2 className="text-lg leading-snug font-bold tracking-tight">Раздел в разработке</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </section>
  )
}
