import { Download } from "lucide-react";
import { downloadFiles, fileUrl } from "@/lib/catalog";
import type { Dataset } from "@/lib/types";

export function Method({ data }: { data: Dataset }) {
  return <div className="content-view method-view">
    <div className="page-heading"><div><h1>Как измеряли</h1><p>Локальная SQLite. Сравнение ORM с драйвером внутри каждого языка.</p></div><a className="text-button" href={fileUrl("benchmark/environment.json")}><Download size={13} />Окружение JSON</a></div>
    <section className="method-section"><h2>Данные и порядок</h2><dl className="definitions">
      {[["База", "10 000 книг, 20 000 выдач; внешний ключ и индекс loans.book_id."], ["Запросы", "Книга по ключу, 100 книг, JOIN на 100 выдач."], ["Проверка", "ORM и SQL возвращают одинаковые значения на трёх контрольных ключах."], ["Прогрев", data.warmups + " запусков каждого варианта до измерений. Они не входят в статистику."], ["Измерения", data.rounds + " раундов по " + data.perRound + " вызовов: " + data.sampleCount + " значений на вариант. ORM и SQL меняются местами через раунд."], ["Входит во время", "Построение запроса, выполнение, полное чтение и преобразование результата."], ["Вне измерений", "Установка, сборка, создание данных, открытие соединений и логирование."]].map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
    </dl></section>
    <section className="method-section"><h2>Медиана, p95 и отношение</h2><dl className="definitions">
      <div><dt>Медиана</dt><dd>Половина выполнений быстрее этого значения, половина — медленнее.</dd></div>
      <div><dt>p95</dt><dd>95% измерений не превышают это время. Индекс: ceil(0,95 × N) − 1 в отсортированном массиве.</dd></div>
      <div><dt>ORM / SQL</dt><dd>Отношение выбранных статистик в одной паре. 2× означает вдвое больше времени, а не дополнительные 2 мкс.</dd></div>
    </dl></section>
    <section className="method-section"><h2>Условия библиотек</h2><div className="table-scroll"><table><thead><tr><th>Библиотека</th><th>Прямой SQL</th><th>SQLite</th></tr></thead><tbody>{data.libraries.map(library => <tr key={library.id}><td>{library.orm}</td><td>{library.driver}</td><td>{library.sqlite}</td></tr>)}</tbody></table></div>
      <p className="method-paragraph">EF Core создаёт DbContext на запрос и использует AsNoTracking. SQLAlchemy создаёт Session на запрос с обычным учётом ORM-объектов. Поиск и список возвращают объекты с одинаковыми полями; JOIN — одинаковую плоскую проекцию.</p>
      <p className="method-paragraph">GORM работает без PrepareStmt, TypeORM — без кеша SQL-выражений драйвера. Границы времени одинаковы для ORM и прямого варианта.</p>
    </section>
    <section className="method-section"><h2>Что означают результаты</h2><p className="method-paragraph">Накладные расходы конкретного API на этих запросах. Версии SQLite и объём работы библиотек различаются; общего рейтинга языков здесь нет.</p><p className="method-paragraph">Холодный старт, сеть, запись и конкурентная нагрузка не измерялись. Выбросы сохранены в исходных данных; доверительные интервалы не рассчитывались.</p></section>
    <section className="method-section"><h2>Схема</h2><div className="relation-summary"><span><strong>books</strong> id PK, title</span><span className="relation-cardinality">1 <i /> 0..*</span><span><strong>loans</strong> id PK, book_id FK</span></div><a className="text-button" href={fileUrl("diagrams/library.drawio")}><Download size={13} />Открыть исходник в draw.io</a></section>
    <details className="source-files"><summary>Исходные файлы</summary><div className="file-list">{downloadFiles.map(file => <a href={fileUrl(file)} key={file}><span>{file}</span><Download size={12} /></a>)}</div></details>
  </div>;
}
