export default function StateMessage({ kind = "info", message }) {
  return <p className={`state-message state-${kind}`}>{message}</p>;
}