import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function Debug() {
  const navigate = useNavigate()
  
  // --- STATE DECLARATIONS (Must be at top level) ---

  // Auth Check State
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [authChecking, setAuthChecking] = useState(true)

  // Login Form State
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')

  // D1 State
  const [tables, setTables] = useState<any[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('')
  const [tableRows, setTableRows] = useState<any[]>([])
  
  // D1 Local State
  const [localTables, setLocalTables] = useState<any[]>([])
  const [selectedLocalTable, setSelectedLocalTable] = useState<string>('')
  const [localTableRows, setLocalTableRows] = useState<any[]>([])
  
  // Edit State for Local D1
  const [editingCell, setEditingCell] = useState<{ rowId: string, col: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  // R2 State
  const [r2Data, setR2Data] = useState<any>(null)
  
  const [loading, setLoading] = useState(false)
  
  const [testResult, setTestResult] = useState<{ path: string, data: any } | null>(null)
  
  // Collapsible Sections State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      'api': true,
      'auth-test': true,
      'apify-tester': true,
      'd1': true,
      'd1-local': true,
      'r2': true
  })

  // Auth Test State (Inside Dashboard)
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '' })
  const [authResponse, setAuthResponse] = useState<any>(null)

  // Apify Test State
  const [apifyForm, setApifyForm] = useState({ actorId: '', input: '', url: '' })
  const [apifyResult, setApifyResult] = useState<any>(null)

  // --- EFFECTS ---

  // 1. Check Auth on Mount
  useEffect(() => {
    const checkAuth = async () => {
        const token = localStorage.getItem('debug_token')
        
        if (!token) {
            setAuthChecking(false)
            return
        }

        try {
            const res = await fetch('http://localhost:8787/api/is/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            
            if (res.ok) {
                const user = await res.json()
                if (user.role === 'ADMIN') {
                    setIsAdmin(true)
                    setCurrentUser(user)
                }
            }
        } catch (e) {
            console.error('Auth check failed', e)
        } finally {
            setAuthChecking(false)
        }
    }
    checkAuth()
  }, [])

  // 2. Fetch Data (Only if Admin)
  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Remote D1 Tables (Cloudflare API)
      const tablesRes = await fetch('http://localhost:8787/api/is/cloudflare/d1/tables')
      const tablesJson = await tablesRes.json()
      if (tablesJson.tables) {
        setTables(tablesJson.tables)
        if (tablesJson.tables.length > 0) {
           setSelectedTable(tablesJson.tables[0].name)
        }
      }

      // 2. Fetch Local D1 Tables (Direct Binding)
      try {
          const localTablesRes = await fetch('http://localhost:8787/api/is/local-d1/tables')
          const localTablesJson = await localTablesRes.json()
          if (localTablesJson.tables) {
            setLocalTables(localTablesJson.tables)
            if (localTablesJson.tables.length > 0) {
               setSelectedLocalTable(localTablesJson.tables[0].name)
            }
          }
      } catch (localErr) {
          console.error("Failed to fetch local tables", localErr)
      }

      // 3. Fetch R2 Buckets
      const r2Res = await fetch('http://localhost:8787/api/is/cloudflare/r2')
      const r2Json = await r2Res.json()
      setR2Data(r2Json)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
       fetchData()
    }
  }, [isAdmin])

  // 3. Fetch rows when selected table changes
  useEffect(() => {
    if (!selectedTable || !isAdmin) return

    const fetchRows = async () => {
        try {
            const res = await fetch(`http://localhost:8787/api/is/cloudflare/d1/${selectedTable}?limit=10`)
            const json = await res.json()
            if (json.rows) {
                setTableRows(json.rows)
            } else {
                setTableRows([])
            }
        } catch (err) {
            console.error(err)
        }
    }
    fetchRows()
  }, [selectedTable, isAdmin])

  // 4. Fetch rows when selected local table changes
  useEffect(() => {
     if (!selectedLocalTable || !isAdmin) return
 
     const fetchRows = async () => {
         try {
             const res = await fetch(`http://localhost:8787/api/is/local-d1/${selectedLocalTable}?limit=10`)
             const json = await res.json()
             if (json.rows) {
                 setLocalTableRows(json.rows)
             } else {
                 setLocalTableRows([])
             }
         } catch (err) {
             console.error(err)
         }
     }
     fetchRows()
   }, [selectedLocalTable, isAdmin])

  // --- HANDLERS ---

  const handleLoginSubmit = async () => {
      setLoading(true)
      setLoginError('')
      try {
          const res = await fetch('http://localhost:8787/api/is/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(loginForm)
          })
          
          const data = await res.json()
          
          if (res.ok && data.accessToken) {
              localStorage.setItem('debug_token', data.accessToken)
              window.location.reload()
          } else {
              setLoginError(data.error || 'Login failed')
          }
      } catch (err: any) {
          setLoginError(err.message)
      } finally {
          setLoading(false)
      }
  }

  const handleEditClick = (row: any, col: string) => {
    setEditingCell({ rowId: row.id, col })
    setEditValue(String(row[col]))
  }

  const handleEditSave = async () => {
      if (!editingCell || !selectedLocalTable) return

      try {
          const res = await fetch(`http://localhost:8787/api/is/local-d1/${selectedLocalTable}/${editingCell.rowId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [editingCell.col]: editValue })
          })

          if (res.ok) {
              // Refresh data
              const fetchRows = async () => {
                  try {
                      const res = await fetch(`http://localhost:8787/api/is/local-d1/${selectedLocalTable}?limit=10`)
                      const json = await res.json()
                      if (json.rows) setLocalTableRows(json.rows)
                  } catch (err) { console.error(err) }
              }
              fetchRows()
              setEditingCell(null)
          } else {
              const err = await res.json()
              alert('Update failed: ' + err.error)
          }
      } catch (e: any) {
          alert('Update failed: ' + e.message)
      }
  }

  const handleEditCancel = () => {
      setEditingCell(null)
      setEditValue('')
  }

  const handleDeleteRow = async (table: string, id: string, isLocal: boolean) => {
      if (!window.confirm('Are you sure you want to delete this row?')) return
      
      const baseUrl = isLocal ? 'http://localhost:8787/api/is/local-d1' : 'http://localhost:8787/api/is/cloudflare/d1'
      
      try {
          const res = await fetch(`${baseUrl}/${table}/${id}`, {
              method: 'DELETE',
          })
          
          if (res.ok) {
              // Refresh
              if (isLocal) {
                  const r = await fetch(`http://localhost:8787/api/is/local-d1/${selectedLocalTable}?limit=10`)
                  const j = await r.json()
                  setLocalTableRows(j.rows || [])
              } else {
                  const r = await fetch(`http://localhost:8787/api/is/cloudflare/d1/${selectedTable}?limit=10`)
                  const j = await r.json()
                  setTableRows(j.rows || [])
              }
          } else {
              alert('Delete failed')
          }
      } catch (e) {
          alert('Delete error')
      }
  }

  const toggleSection = (key: string) => {
      setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleAuthSubmit = async (type: 'register' | 'login') => {
      setLoading(true)
      try {
          const res = await fetch(`http://localhost:8787/api/is/auth/${type}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(authForm)
          })
          const data = await res.json()
          setAuthResponse({ type, data })
          
          if (res.ok && data.accessToken) {
             localStorage.setItem('debug_token', data.accessToken)
             if (window.confirm('Login successful. Reload to check admin access?')) {
                 window.location.reload()
             }
          }
      } catch (err: any) {
          setAuthResponse({ type, data: { error: err.message } })
      } finally {
          setLoading(false)
      }
  }
  
  const handleApifySubmit = async () => {
      setLoading(true)
      try {
          const token = localStorage.getItem('debug_token')
          if (!token) {
              alert('Please verify admin token first (refresh page if logged in)')
              setLoading(false)
              return
          }

          let inputJson: any = {}
          try {
              inputJson = JSON.parse(apifyForm.input || '{}')
          } catch (e) {
              alert('Invalid JSON input')
              setLoading(false)
              return
          }

          // Merge URL into input if provided
          if (apifyForm.url) {
              // Assuming input requires startUrls array or similar based on actor
              // Common pattern for Apify actors:
              if (!inputJson.startUrls) {
                  inputJson.startUrls = []
              }
              // If startUrls is array of strings or objects
              inputJson.startUrls.push({ url: apifyForm.url })
              
              // Also add to directUrls if used
              if (!inputJson.directUrls) {
                  inputJson.directUrls = []
              }
              inputJson.directUrls.push(apifyForm.url)
          }

          const res = await fetch('http://localhost:8787/api/is/apify/run', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  actorId: apifyForm.actorId,
                  input: inputJson
              })
          })
          const data = await res.json()
          setApifyResult(data)
      } catch (err: any) {
          setApifyResult({ error: err.message })
      } finally {
          setLoading(false)
      }
  }
  
  const apiGroups = {
      'System': [
        { method: 'GET', path: '/api/is/health', desc: 'Health Check' },
      ],
      'Cloudflare D1 (Database)': [
        { method: 'GET', path: '/api/is/cloudflare/d1/tables', desc: 'List D1 Tables' },
        { method: 'GET', path: '/api/is/cloudflare/d1/:table', desc: 'Get Table Rows (uses selected table)', dynamic: true },
        { method: 'GET', path: '/api/is/cloudflare/d1/:table/:id', desc: 'Get Single Row (needs ID)', dynamic: true },
        { method: 'POST', path: '/api/is/cloudflare/d1/:table', desc: 'Add Row (needs body)', dynamic: true },
        { method: 'PATCH', path: '/api/is/cloudflare/d1/:table/:id', desc: 'Update Row (needs body)', dynamic: true },
        { method: 'DELETE', path: '/api/is/cloudflare/d1/:table/:id', desc: 'Delete Row (needs ID)', dynamic: true },
        { method: 'POST', path: '/api/is/cloudflare/d1/query', desc: 'Raw SQL Query' },
      ],
      'SQLite D1 (Local Database)': [
        { method: 'GET', path: '/api/is/local-d1/tables', desc: 'List Local Tables' },
        { method: 'GET', path: '/api/is/local-d1/:table', desc: 'Get Table Rows (uses selected local table)', dynamic: true },
        { method: 'GET', path: '/api/is/local-d1/:table/:id', desc: 'Get Single Row (needs ID)', dynamic: true },
        { method: 'PATCH', path: '/api/is/local-d1/:table/:id', desc: 'Update Row (needs body)', dynamic: true },
        { method: 'DELETE', path: '/api/is/local-d1/:table/:id', desc: 'Delete Row (needs ID)', dynamic: true },
      ],
      'Apify Scraper': [
        { method: 'POST', path: '/api/is/apify/run', desc: 'Start Actor Run (body: {actorId, input})', dynamic: true },
        { method: 'GET', path: '/api/is/apify/job/:id', desc: 'Get Job Status (needs Job ID)', dynamic: true },
        { method: 'GET', path: '/api/is/apify/job/:id/dataset', desc: 'Get Job Dataset (needs Job ID)', dynamic: true },
        { method: 'POST', path: '/api/is/apify/webhook', desc: 'Webhook (called by Apify)', dynamic: true },
      ],
      'Cloudflare R2 (Storage)': [
        { method: 'GET', path: '/api/is/cloudflare/r2', desc: 'List R2 Buckets' },
      ],
      'Authentication': [
        { method: 'POST', path: '/api/is/auth/register', desc: 'Register User (email, password, username)', dynamic: true },
        { method: 'POST', path: '/api/is/auth/login', desc: 'Login User (email, password)', dynamic: true },
        { method: 'POST', path: '/api/is/auth/refresh', desc: 'Refresh Token', dynamic: true },
        { method: 'POST', path: '/api/is/auth/logout', desc: 'Logout', dynamic: true },
        { method: 'POST', path: '/api/is/auth/verify-email', desc: 'Verify Email', dynamic: true },
        { method: 'POST', path: '/api/is/auth/resend-verification', desc: 'Resend Verification', dynamic: true },
        { method: 'POST', path: '/api/is/auth/forgot-password', desc: 'Forgot Password', dynamic: true },
        { method: 'POST', path: '/api/is/auth/reset-password', desc: 'Reset Password', dynamic: true },
        { method: 'POST', path: '/api/is/auth/subscription', desc: 'Subscription', dynamic: true },
      ],
      'User (Logged In)': [
        { method: 'GET', path: '/api/is/me', desc: 'Get My Profile' },
        { method: 'GET', path: '/api/is/me/scrapes', desc: 'Get My Scrapes (SUPPORTER only)' },
        { method: 'DELETE', path: '/api/is/me/scrapes/:jobId', desc: 'Delete Scrape Job', dynamic: true },
        { method: 'DELETE', path: '/api/is/me/scrapes', desc: 'Bulk Delete Scrapes (needs body)', dynamic: true },
        { method: 'GET', path: '/api/is/me/scrapes/export', desc: 'Export Scrapes (SUPPORTER only)' },
        { method: 'PUT', path: '/api/is/me/apify-key', desc: 'Update Apify Key (SUPPORTER only)', dynamic: true },
        { method: 'GET', path: '/api/is/me/subscription', desc: 'Get Subscription Info' },
        { method: 'GET', path: '/api/is/me/credits', desc: 'Get Credits' },
      ]
  }

  const handleTestRoute = async (route: any) => {
      let url = `http://localhost:8787${route.path}`
      
      if (route.path.includes(':table')) {
          if (route.path.includes('local-d1') && selectedLocalTable) {
              url = url.replace(':table', selectedLocalTable)
          } else if (selectedTable) {
              url = url.replace(':table', selectedTable)
          }
      }

      if (route.method !== 'GET' || route.path.includes(':id')) {
          alert('Testing dynamic/write routes is not fully implemented in this quick view yet.')
          return
      }

      try {
          const token = localStorage.getItem('debug_token')
          const headers: Record<string, string> = {}
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }

          const res = await fetch(url, { headers })
          const json = await res.json()
          setTestResult({ path: route.path, data: json })
      } catch (err) {
          console.error(err)
          setTestResult({ path: route.path, data: { error: 'Failed to fetch' } })
      }
  }

  const handleLogout = () => {
      localStorage.removeItem('debug_token')
      window.location.reload()
  }

  // --- RENDER ---

  if (authChecking) {
      return <div className="min-h-screen flex items-center justify-center">Checking permissions...</div>
  }

  if (!isAdmin) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
              <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md w-full">
                  <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                  <p className="text-gray-600 mb-6">
                      You must be logged in as an <strong>ADMIN</strong> to access the Debug Dashboard.
                  </p>
                  
                  {/* Option 1: Paste Token */}
                  <div className="mb-6 text-left border-b pb-6">
                      <p className="text-sm font-medium mb-2">1. Paste Token</p>
                      <input 
                        type="text" 
                        placeholder="Paste Bearer Token"
                        className="w-full border p-2 rounded mb-2"
                        id="token-input"
                      />
                      <button 
                        onClick={() => {
                            const input = document.getElementById('token-input') as HTMLInputElement
                            if (input.value) {
                                localStorage.setItem('debug_token', input.value)
                                window.location.reload()
                            }
                        }}
                        className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                      >
                          Set Token
                      </button>
                  </div>

                  {/* Option 2: Login */}
                  <div className="mb-6 text-left">
                      <p className="text-sm font-medium mb-2">2. Login with Email & Password</p>
                      <input 
                        type="email" 
                        placeholder="Email"
                        className="w-full border p-2 rounded mb-2"
                        value={loginForm.email}
                        onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                      />
                      <input 
                        type="password" 
                        placeholder="Password"
                        className="w-full border p-2 rounded mb-2"
                        value={loginForm.password}
                        onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                      />
                      {loginError && <p className="text-red-500 text-xs mb-2">{loginError}</p>}
                      <button 
                        onClick={handleLoginSubmit}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                          {loading ? 'Logging in...' : 'Login & Reload'}
                      </button>
                  </div>

                  <Link to="/" className="text-blue-500 hover:underline">← Go Back Home</Link>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-8">
      <div className="w-full max-w-6xl mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Debug Dashboard</h1>
        <div className="flex items-center gap-4">
             <Link to="/" className="text-blue-600 hover:underline">← Back to Home</Link>
             {currentUser && (
                 <div className="flex items-center gap-2 text-sm bg-white px-3 py-1 rounded shadow-sm">
                     <span className="font-semibold text-gray-700">[{currentUser.username || currentUser.email}]</span>
                     <span className="text-gray-300">|</span>
                     <button onClick={handleLogout} className="text-red-500 hover:text-red-700 font-medium">- Logout</button>
                 </div>
             )}
        </div>
      </div>

      {/* API Routes Cards */}
      <div className="w-full max-w-6xl mb-8">
          <div 
            className="flex justify-between items-center cursor-pointer bg-white p-4 rounded-t-xl shadow-sm border-b"
            onClick={() => toggleSection('api')}
          >
             <h2 className="text-2xl font-semibold text-gray-800">Implemented API Routes</h2>
             <span className="text-gray-500">{openSections['api'] ? '▼' : '▶'}</span>
          </div>
          
          {openSections['api'] && (
            <div className="bg-white p-6 rounded-b-xl shadow-md">
                {Object.entries(apiGroups).map(([groupName, routes]) => (
                    <div key={groupName} className="mb-8 last:mb-0">
                        <h3 className="text-xl font-medium mb-4 text-gray-700 border-b pb-2">{groupName}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {routes.map((route) => (
                                <div 
                                    key={route.path + route.method} 
                                    onClick={() => handleTestRoute(route)}
                                    className="bg-white p-4 rounded-lg shadow border border-gray-100 hover:shadow-md transition-all cursor-pointer hover:border-blue-300 active:scale-95"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            route.method === 'GET' ? 'bg-green-100 text-green-700' :
                                            route.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                                            route.method === 'PATCH' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {route.method}
                                        </span>
                                        <span className="text-xs text-gray-400">Click to test</span>
                                    </div>
                                    <code className="block bg-gray-50 p-2 rounded text-sm font-mono text-gray-700 mb-2 truncate" title={route.path}>
                                        {route.path}
                                    </code>
                                    <p className="text-gray-500 text-sm">{route.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
          )}

          {/* Test Result Modal/Overlay */}
          {testResult && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setTestResult(null)}>
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                      <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                          <h3 className="font-bold text-lg">Test Result: {testResult.path}</h3>
                          <button onClick={() => setTestResult(null)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                      </div>
                      <div className="p-4 overflow-auto bg-slate-900 text-green-400 font-mono text-sm">
                          <pre>{JSON.stringify(testResult.data, null, 2)}</pre>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* Auth Test Section */}
      <div className="w-full max-w-6xl mb-8">
          <div 
            className="flex justify-between items-center cursor-pointer bg-white p-4 rounded-t-xl shadow-sm border-b"
            onClick={() => toggleSection('auth-test')}
          >
             <h2 className="text-2xl font-semibold text-gray-800">Test Auth (Register / Login)</h2>
             <span className="text-gray-500">{openSections['auth-test'] ? '▼' : '▶'}</span>
          </div>

          {openSections['auth-test'] && (
              <div className="bg-white p-6 rounded-b-xl shadow-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Form */}
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Email</label>
                              <input 
                                type="email" 
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={authForm.email}
                                onChange={e => setAuthForm({...authForm, email: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Password</label>
                              <input 
                                type="password" 
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={authForm.password}
                                onChange={e => setAuthForm({...authForm, password: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Username</label>
                              <input 
                                type="text" 
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={authForm.username}
                                onChange={e => setAuthForm({...authForm, username: e.target.value})}
                              />
                          </div>
                          <div className="flex gap-4 pt-2">
                              <button 
                                onClick={() => handleAuthSubmit('register')}
                                disabled={loading}
                                className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                  Test Register
                              </button>
                           {/*    <button 
                                onClick={() => handleAuthSubmit('login')}
                                disabled={loading}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                  Test Login
                              </button> */}
                          </div>
                      </div>

                      {/* Result */}
                      <div className="bg-gray-50 rounded-lg p-4 border overflow-auto max-h-[300px]">
                          <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase">Response</h4>
                          {authResponse ? (
                              <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                                  {JSON.stringify(authResponse, null, 2)}
                              </pre>
                          ) : (
                              <p className="text-sm text-gray-400 italic">No request made yet.</p>
                          )}
                      </div>
                  </div>
              </div>
          )}
      </div>

      <div className="w-full max-w-6xl mb-8">
          <div 
            className="flex justify-between items-center cursor-pointer bg-white p-4 rounded-t-xl shadow-sm border-b"
            onClick={() => toggleSection('apify-tester')}
          >
             <h2 className="text-2xl font-semibold text-gray-800">Apify Tester</h2>
             <span className="text-gray-500">{openSections['apify-tester'] ? '▼' : '▶'}</span>
          </div>

          {openSections['apify-tester'] && (
              <div className="bg-white p-6 rounded-b-xl shadow-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Form */}
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Actor ID</label>
                              <input 
                                type="text" 
                                placeholder="e.g. shu8hvrXbJbY3Eb9W"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={apifyForm.actorId}
                                onChange={e => setApifyForm({...apifyForm, actorId: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Target URL (Optional)</label>
                              <input 
                                type="text" 
                                placeholder="https://instagram.com/..."
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={apifyForm.url}
                                onChange={e => setApifyForm({...apifyForm, url: e.target.value})}
                              />
                              <p className="text-xs text-gray-500 mt-1">Will be added to startUrls in Input JSON</p>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Input (JSON)</label>
                              <textarea 
                                placeholder='{ "search": "tesla", "resultsLimit": 5 }'
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 h-32 font-mono text-xs"
                                value={apifyForm.input}
                                onChange={e => setApifyForm({...apifyForm, input: e.target.value})}
                              />
                          </div>
                          <button 
                            onClick={handleApifySubmit}
                            disabled={loading}
                            className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                              {loading ? 'Running...' : 'Run Actor'}
                          </button>
                      </div>

                      {/* Result */}
                      <div className="bg-gray-50 rounded-lg p-4 border overflow-auto max-h-[300px]">
                          <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase">Run Output</h4>
                          {apifyResult ? (
                              <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                                  {JSON.stringify(apifyResult, null, 2)}
                              </pre>
                          ) : (
                              <p className="text-sm text-gray-400 italic">No run data.</p>
                          )}
                      </div>
                  </div>
              </div>
          )}
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* D1 Data Table */}
        <div className="bg-white rounded-xl shadow-md">
          <div 
            className="flex justify-between items-center cursor-pointer p-6 border-b"
            onClick={() => toggleSection('d1')}
          >
             <h2 className="text-2xl font-semibold text-gray-800">D1 Databases (Via API)</h2>
             <span className="text-gray-500">{openSections['d1'] ? '▼' : '▶'}</span>
          </div>
          
          {openSections['d1'] && (
            <div className="p-6">
                {/* Table Selector */}
                <div className="mb-4">
                    <label className="mr-2 font-medium">Select Table:</label>
                    <select 
                        value={selectedTable} 
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="border rounded p-1"
                    >
                        {tables.map((t: any) => (
                            <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : tableRows.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                            <th className="px-4 py-2 w-10">Action</th>
                            {Object.keys(tableRows[0]).map(key => (
                                <th key={key} className="px-4 py-2">{key}</th>
                            ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tableRows.map((row: any, i) => (
                            <tr key={i}>
                                <td className="px-4 py-2">
                                    <button 
                                        onClick={() => handleDeleteRow(selectedTable, row.id, false)}
                                        className="text-red-500 hover:text-red-700 font-bold"
                                        title="Delete Row"
                                    >
                                        &times;
                                    </button>
                                </td>
                                {Object.values(row).map((val: any, j) => (
                                    <td key={j} className="px-4 py-2 truncate max-w-[200px]">{String(val)}</td>
                                ))}
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No rows found in {selectedTable}.</p>
                )}
            </div>
          )}
        </div>

        {/* Local SQLite Data Table */}
        <div className="bg-white rounded-xl shadow-md">
          <div 
            className="flex justify-between items-center cursor-pointer p-6 border-b"
            onClick={() => toggleSection('d1-local')}
          >
             <h2 className="text-2xl font-semibold text-gray-800">sqlite Databases (local)</h2>
             <span className="text-gray-500">{openSections['d1-local'] ? '▼' : '▶'}</span>
          </div>
          
          {openSections['d1-local'] && (
            <div className="p-6">
                {/* Table Selector */}
                <div className="mb-4">
                    <label className="mr-2 font-medium">Select Table:</label>
                    <select 
                        value={selectedLocalTable} 
                        onChange={(e) => setSelectedLocalTable(e.target.value)}
                        className="border rounded p-1"
                    >
                        {localTables.map((t: any) => (
                            <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : localTableRows.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                            <th className="px-4 py-2 w-10">Action</th>
                            {Object.keys(localTableRows[0]).map(key => (
                                <th key={key} className="px-4 py-2">{key}</th>
                            ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {localTableRows.map((row: any, i) => (
                            <tr key={i}>
                                <td className="px-4 py-2 border-l first:border-l-0">
                                    <button 
                                        onClick={() => handleDeleteRow(selectedLocalTable, row.id, true)}
                                        className="text-red-500 hover:text-red-700 font-bold"
                                        title="Delete Row"
                                    >
                                        &times;
                                    </button>
                                </td>
                                {Object.keys(row).map((key: string, j) => {
                                    const isEditing = editingCell?.rowId === row.id && editingCell?.col === key
                                    return (
                                        <td key={j} className="px-4 py-2 truncate max-w-[200px] border-l first:border-l-0" 
                                            onDoubleClick={() => handleEditClick(row, key)}
                                            title="Double click to edit"
                                        >
                                            {isEditing ? (
                                                <div className="flex gap-1">
                                                    <input 
                                                        className="border rounded p-1 text-sm w-full"
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button onClick={handleEditSave} className="text-green-600 font-bold">✓</button>
                                                    <button onClick={handleEditCancel} className="text-red-600 font-bold">✕</button>
                                                </div>
                                            ) : (
                                                String(row[key])
                                            )}
                                        </td>
                                    )
                                })}
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No rows found in {selectedLocalTable}.</p>
                )}
            </div>
          )}
        </div>

        {/* R2 Data Table */}
        <div className="bg-white rounded-xl shadow-md h-fit">
          <div 
            className="flex justify-between items-center cursor-pointer p-6 border-b"
            onClick={() => toggleSection('r2')}
          >
             <h2 className="text-2xl font-semibold text-gray-800">R2 Buckets (Via API)</h2>
             <span className="text-gray-500">{openSections['r2'] ? '▼' : '▶'}</span>
          </div>

          {openSections['r2'] && (
            <div className="p-6">
                {loading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : r2Data && r2Data.buckets && r2Data.buckets.length > 0 ? (
                    <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2">Name</th>
                            <th className="px-4 py-2">Created</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {r2Data.buckets.map((bucket: any) => (
                            <tr key={bucket.name}>
                            <td className="px-4 py-2 font-mono text-xs">{bucket.name}</td>
                            <td className="px-4 py-2">{new Date(bucket.creation_date).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No buckets found in R2.</p>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Debug