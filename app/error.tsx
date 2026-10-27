"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="error-page">
    <span className="wordmark">orm<span>_test</span></span>
    <h1>Не удалось загрузить измерения</h1>
    <p>Проверьте файлы в benchmark и запустите страницу снова.</p>
    <button className="primary-button" onClick={reset}>Повторить</button>
  </main>;
}
