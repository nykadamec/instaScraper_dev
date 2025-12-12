import { useState } from 'react'
import { Link } from 'react-router-dom'

function App() {
  const [count, setCount] = useState(0)
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-8">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">InstaScraper</h1>
      <p className="text-gray-700 mb-8">Download Instagram images with ease.</p>
      
      <button 
        onClick={() => setCount((count) => count + 1)}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mb-10"
      >
        count is {count}
      </button>

      <footer className="mt-auto pt-12 text-center text-sm text-gray-500">
        <p>InstaScraper v0.1.0</p>
        <Link to="/debug" className="text-blue-500 hover:underline mt-2 inline-block">
            Developer Debug Dashboard
        </Link>
      </footer>
    </div>
  )
}

export default App
