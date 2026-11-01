import styles from "./HouseRules.module.css";

const RULES = [
  ["No announcements after ten.", "If something needs saying after ten, someone will knock."],
  ["Dogs travel free.", "They get a blanket and a bowl. Cats have been asked and declined to comment."],
  ["The corridor window opens.", "An actual window, for leaning out of, at a speed we've thought about."],
  ["We wait for you.", "Miss a connection because of us and the next train is free, with a hotel if it comes to that."],
  ["Breakfast is at your door.", "Bread from the last city we stopped in. We won't say which, in case it was Innsbruck."],
];

export function HouseRules() {
  return (
    <section className={styles.section} aria-labelledby="rules-heading">
      <div className="wrap">
        <h2 id="rules-heading" className={styles.heading}>
          House rules
        </h2>
        <ol className={styles.rules}>
          {RULES.map(([rule, note]) => (
            <li key={rule} className={styles.rule}>
              <p className={`sign ${styles.big}`}>{rule}</p>
              <p className={styles.note}>{note}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
