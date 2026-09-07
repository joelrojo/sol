import { Link } from 'react-router-dom'
import Hyphae from '../field/Hyphae.jsx'

export default function Splash() {
  const src = `${import.meta.env.BASE_URL}valle-lockup.jpg`

  return (
    <main className="splash">
      <div className="splash-wash" aria-hidden="true">
        <img src={src} alt="" />
      </div>
      <Hyphae />
      <h1 className="visually-hidden">Valle del Sol</h1>
      <figure className="splash-frame">
        <img src={src} alt="" />
      </figure>
      <Link className="vision-mark" to="/vision">
        vision
      </Link>
    </main>
  )
}
