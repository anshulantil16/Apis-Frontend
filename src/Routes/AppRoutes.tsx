import { BrowserRouter, Routes, Route } from "react-router-dom"
import HomePage from "../features/extractor/HomePage"

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