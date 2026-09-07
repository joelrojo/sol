import { Link } from 'react-router-dom'

export default function Splash() {
  return (
    <main className="splash">
      <h1 className="visually-hidden">Valle del Sol</h1>
      <img src={`${import.meta.env.BASE_URL}valle-lockup.jpg`} alt="" />
      <Link className="vision-mark" to="/vision">
        vision
      </Link>
    </main>
  )
}
