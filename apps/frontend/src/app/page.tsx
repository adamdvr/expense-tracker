export default function Home() {
  return (
    <main className="container">
      <div className="hero">
        <h1>Трекер расходов</h1>
        <p className="subtitle">
          Управляйте своими финансами с легкостью
        </p>
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>Аналитика</h3>
          <p>Визуализация расходов и доходов</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">💰</div>
          <h3>Бюджеты</h3>
          <p>Планирование и контроль бюджета</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📱</div>
          <h3>Категории</h3>
          <p>Организация расходов по категориям</p>
        </div>
      </div>

      <div className="status">
        <p className="status-text">Проект готов к разработке</p>
      </div>
    </main>
  )
}
