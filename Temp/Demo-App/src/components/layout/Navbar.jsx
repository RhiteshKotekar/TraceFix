import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useDebounce } from '../../hooks'
import { failureScenarios } from '../../failureSimulator/registry'
import { recoverScenario, runScenario } from '../../failureSimulator/dispatcher'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { totalItems } = useCart()
  const navigate = useNavigate()
  const location = useLocation()

  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scenarioState, setScenarioState] = useState({})
  const [scenarioBusy, setScenarioBusy] = useState(null)

  const debouncedSearch = useDebounce(search, 400)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const backend = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5002'
    fetch(`${backend}/api/demo/health/state`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.status === 'unhealthy') {
          setScenarioState((current) => ({ ...current, 'health-check-failure': { status: 'active', message: 'Health probe is currently unhealthy.' } }))
        }
      })
      .catch(() => {})
  }, [])

  const triggerScenario = async (scenario) => {
    setScenarioBusy(scenario.id)
    setScenarioState((current) => ({ ...current, [scenario.id]: { status: 'running', message: 'Triggering scenario…' } }))
    try {
      const message = await runScenario(scenario.id)
      setScenarioState((current) => ({ ...current, [scenario.id]: { status: scenario.id === 'health-check-failure' ? 'active' : 'completed', message } }))
    } catch (error) {
      setScenarioState((current) => ({ ...current, [scenario.id]: { status: 'failed', message: error.message } }))
    } finally {
      setScenarioBusy(null)
    }
  }

  const recoverFailure = async (scenario) => {
    setScenarioBusy(scenario.id)
    setScenarioState((current) => ({ ...current, [scenario.id]: { status: 'running', message: 'Resetting health check…' } }))
    try {
      const message = await recoverScenario(scenario.id)
      setScenarioState((current) => ({ ...current, [scenario.id]: { status: 'completed', message } }))
    } catch (error) {
      setScenarioState((current) => ({ ...current, [scenario.id]: { status: 'failed', message: error.message } }))
    } finally {
      setScenarioBusy(null)
    }
  }

  useEffect(() => {
    if (debouncedSearch.trim()) {
      navigate(`/shop?search=${encodeURIComponent(debouncedSearch.trim())}`)
    }
  }, [debouncedSearch, navigate])

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner container-wide">
          <Link to="/" className="navbar-logo">
            <span className="logo-icon">⬡</span>
            ShopForge
          </Link>

          <div className="navbar-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search.trim() && navigate(`/shop?search=${encodeURIComponent(search.trim())}`)}
            />
          </div>

          <nav className={`navbar-nav ${menuOpen ? 'open' : ''}`}>
            <Link to="/shop" className="nav-link">Shop</Link>
            <Link to="/products" className="nav-link">All Products</Link>
            <details className="failure-simulator">
              <summary>Failure Simulator</summary>
              <div className="failure-simulator-panel">
                <p className="simulator-notice">Controlled demonstration scenarios. Use only in a dedicated demo environment.</p>
                <div className="simulator-scenario-grid">
                  {failureScenarios.filter((scenario) => scenario.enabled).map((scenario) => {
                    const state = scenarioState[scenario.id] || { status: 'idle', message: 'Ready' }
                    return (
                      <article className="simulator-scenario" key={scenario.id}>
                        <div className="simulator-scenario-heading">
                          <strong>{scenario.name}</strong>
                          <span>{scenario.category} · {scenario.severity}</span>
                        </div>
                        <p>{scenario.description}</p>
                        <div className="simulator-scenario-actions">
                          <button
                            type="button"
                            className="simulator-trigger"
                            disabled={scenarioBusy !== null || state.status === 'active'}
                            onClick={() => triggerScenario(scenario)}
                          >{scenarioBusy === scenario.id ? 'Working…' : 'Trigger'}</button>
                          <span className={`simulator-status is-${state.status}`} role="status">{state.status}</span>
                          {scenario.recovery && state.status === 'active' && (
                            <button type="button" className="simulator-recover" disabled={scenarioBusy !== null} onClick={() => recoverFailure(scenario)}>
                              Reset health check
                            </button>
                          )}
                        </div>
                        <p className="simulator-signal"><b>Expected:</b> {scenario.expectedSignals}</p>
                        {state.message !== 'Ready' && <p className="simulator-result">{state.message}</p>}
                        {scenario.recovery && <small>{scenario.recovery}</small>}
                      </article>
                    )
                  })}
                </div>
                <small className="simulator-footnote">Requests go directly to the demo backend. No deployment state is changed.</small>
              </div>
            </details>

            {user ? (
              <div className="user-menu" ref={userMenuRef}>
                <button className="user-btn" onClick={() => setUserMenuOpen((p) => !p)}>
                  <span className="user-avatar">{user.name?.[0]?.toUpperCase() || 'U'}</span>
                  <span className="user-name">{user.name?.split(' ')[0] || 'User'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="user-dropdown">
                    <Link to="/orders" onClick={() => setUserMenuOpen(false)}>My Orders</Link>
                    <Link to="/wishlist" onClick={() => setUserMenuOpen(false)}>Wishlist</Link>
                    {user.isAdmin && <Link to="/admin" onClick={() => setUserMenuOpen(false)}>Admin Panel</Link>}
                    <div className="dropdown-divider" />
                    <button onClick={handleLogout}>Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="nav-link">Sign In</Link>
            )}

            <Link to="/cart" className="cart-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </Link>
          </nav>

          <button className="hamburger" onClick={() => setMenuOpen((p) => !p)} aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>
    </>
  )
}
