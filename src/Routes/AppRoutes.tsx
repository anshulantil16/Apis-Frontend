import { BrowserRouter, Routes, Route } from "react-router-dom"
import HomePage from "../Pages/HomePage"

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes