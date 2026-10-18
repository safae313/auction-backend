import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  CircleAlert,
  Fuel,
  Gauge,
  Gavel,
  Heart,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Timer,
  X,
} from 'lucide-react'
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  API_BASE_URL,
  getAuction,
  getAuctions,
  getBids,
  placeBid,
} from './lib/api'
import './App.css'

const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

function firstValue(record, keys) {
  for (const key of keys) {
    const value = record?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }
  return null
}

function auctionIdOf(auction) {
  return firstValue(auction, ['id', 'auction_id', 'auctionId'])
}

function auctionTitle(auction) {
  const explicit = firstValue(auction, ['title', 'name', 'vehicle_name', 'vehicleName'])
  if (explicit) return String(explicit)

  const make = firstValue(auction, ['make', 'brand', 'marque', 'manufacturer'])
  const model = firstValue(auction, ['model', 'vehicle_model'])
  if (make || model) return [make, model].filter(Boolean).join(' ')

  return `Véhicule #${auctionIdOf(auction) ?? '—'}`
}

function auctionImage(auction) {
  const value = firstValue(auction, [
    'image_url',
    'imageUrl',
    'photo_url',
    'photoUrl',
    'cover_image',
    'coverImage',
    'image',
    'photo',
  ])
  if (Array.isArray(value)) return value[0] || null
  return typeof value === 'string' ? value : null
}

function currentPrice(auction) {
  const raw = firstValue(auction, [
    'current_price',
    'currentPrice',
    'highest_bid',
    'highestBid',
    'price',
  ])
  if (raw === null || !Number.isFinite(Number(raw))) return null
  return Number(raw)
}

function isAuctionOpen(auction) {
  return String(firstValue(auction, ['status', 'state']) ?? '').toUpperCase() === 'OPEN'
}

function formatPrice(price) {
  return price === null ? 'Prix non communiqué' : euro.format(price)
}

function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date)
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="Moteur — accueil">
          <span className="brand-mark"><CarFront size={23} strokeWidth={2.2} /></span>
          <span className="brand-name">moteur<span>.</span></span>
        </Link>
        <button
          className="mobile-menu-button"
          type="button"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={21} /> : <SlidersHorizontal size={21} />}
        </button>
        <nav className={menuOpen ? 'main-nav main-nav-open' : 'main-nav'}>
          <Link to="/" onClick={() => setMenuOpen(false)}>Les enchères</Link>
          <a href="/#comment-ca-marche" onClick={() => setMenuOpen(false)}>Comment ça marche</a>
        </nav>
        <a className="header-cta" href="#vehicules">
          Explorer les véhicules <ArrowUpRight size={16} />
        </a>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link className="brand footer-brand" to="/">
          <span className="brand-mark"><CarFront size={21} /></span>
          <span className="brand-name">moteur<span>.</span></span>
        </Link>
        <span>Les belles histoires commencent sur la route.</span>
        <span className="footer-api">API · {API_BASE_URL}</span>
      </div>
    </footer>
  )
}

function LoadingState({ detail = false }) {
  return (
    <div className={detail ? 'loading-state detail-loading' : 'loading-state'} role="status">
      <span className="spinner" />
      <span>{detail ? 'Chargement du véhicule…' : 'Recherche des véhicules…'}</span>
    </div>
  )
}

function ErrorState({ message, onRetry, compact = false }) {
  return (
    <div className={compact ? 'error-state error-compact' : 'error-state'} role="alert">
      <span className="error-icon"><CircleAlert size={21} /></span>
      <div>
        <h2>Impossible de joindre l’API</h2>
        <p>{message}</p>
        <p className="error-hint">
          Vérifiez que le backend fonctionne et que son origine autorise le frontend via CORS.
        </p>
      </div>
      {onRetry && (
        <button className="button button-outline" type="button" onClick={onRetry}>
          <RefreshCw size={15} /> Réessayer
        </button>
      )}
    </div>
  )
}

function VehicleImage({ auction, className = '' }) {
  const [failed, setFailed] = useState(false)
  const image = auctionImage(auction)

  if (!image || failed) {
    return (
      <div className={`vehicle-image vehicle-image-placeholder ${className}`}>
        <CarFront size={54} strokeWidth={1.1} />
        <span>Photo non disponible</span>
      </div>
    )
  }

  return (
    <div className={`vehicle-image ${className}`}>
      <img
        src={image}
        alt={auctionTitle(auction)}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

function AuctionCard({ auction, index }) {
  const id = auctionIdOf(auction)
  const statusOpen = isAuctionOpen(auction)
  const year = firstValue(auction, ['year', 'vehicle_year', 'vehicleYear', 'annee'])
  const mileage = firstValue(auction, ['mileage', 'mileage_km', 'kilometrage', 'odometer'])
  const location = firstValue(auction, ['location', 'city', 'ville'])
  const bidsCount = firstValue(auction, ['bid_count', 'bids_count', 'bidCount'])

  return (
    <article className="auction-card" style={{ '--card-index': index }}>
      <Link className="card-image-link" to={`/vehicles/${encodeURIComponent(id)}`}>
        <VehicleImage auction={auction} />
        <span className={statusOpen ? 'status-pill status-open' : 'status-pill status-closed'}>
          <span className="status-dot" />{statusOpen ? 'En cours' : String(firstValue(auction, ['status', 'state']) || 'Statut indisponible')}
        </span>
        <span className="image-arrow"><ArrowUpRight size={18} /></span>
      </Link>
      <div className="card-body">
        <div className="card-heading">
          <div>
            {year && <span className="eyebrow">{year}</span>}
            <h2><Link to={`/vehicles/${encodeURIComponent(id)}`}>{auctionTitle(auction)}</Link></h2>
          </div>
          <span className="icon-button favorite-button" aria-hidden="true">
            <Heart size={18} />
          </span>
        </div>
        <div className="card-specs">
          {mileage && <span><Gauge size={14} /> {Number(mileage).toLocaleString('fr-FR')} km</span>}
          {location && <span><MapPin size={14} /> {location}</span>}
          {bidsCount !== null && <span><Gavel size={14} /> {bidsCount} offre{Number(bidsCount) > 1 ? 's' : ''}</span>}
          {!mileage && !location && bidsCount === null && <span>Informations disponibles sur la fiche</span>}
        </div>
        <div className="card-bottom">
          <div>
            <span className="price-label">Prix actuel</span>
            <strong className="card-price">{formatPrice(currentPrice(auction))}</strong>
          </div>
          <Link className="text-link" to={`/vehicles/${encodeURIComponent(id)}`}>
            Découvrir <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  )
}

function EmptyState({ searching, onReset }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><CarFront size={28} /></span>
      <h2>{searching ? 'Aucun véhicule trouvé' : 'Aucun véhicule en vente pour le moment'}</h2>
      <p>
        {searching
          ? 'Essayez avec un autre nom ou effacez votre recherche.'
          : 'Les véhicules apparaîtront ici dès que l’API en proposera.'}
      </p>
      {searching && <button className="button button-outline" type="button" onClick={onReset}>Effacer la recherche</button>}
    </div>
  )
}

function HomePage() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getAuctions(controller.signal)
      .then((result) => {
        if (!Array.isArray(result)) {
          throw new Error('La réponse de GET /api/auctions doit être une liste JSON.')
        }
        setAuctions(result)
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [reloadKey])

  function retry() {
    setLoading(true)
    setError('')
    setReloadKey((key) => key + 1)
  }

  const filteredAuctions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr')
    return auctions.filter((auction) => {
      if (filter === 'open' && !isAuctionOpen(auction)) return false
      if (!query) return true
      return [
        auctionTitle(auction),
        auctionIdOf(auction),
        firstValue(auction, ['make', 'brand', 'marque']),
        firstValue(auction, ['model', 'vehicle_model']),
        firstValue(auction, ['year', 'vehicle_year']),
        firstValue(auction, ['location', 'city', 'ville']),
      ].some((value) => String(value ?? '').toLocaleLowerCase('fr').includes(query))
    })
  }, [auctions, filter, search])

  const openCount = auctions.filter(isAuctionOpen).length
  const startingFrom = auctions
    .map(currentPrice)
    .filter((price) => price !== null && price > 0)
    .sort((a, b) => a - b)[0]

  return (
    <main>
      <section className="hero">
        <div className="hero-noise" />
        <div className="hero-content">
          <div className="hero-copy">
            <span className="hero-kicker"><span className="live-dot" /> LE MARCHÉ AUTOMOBILE, AUTREMENT</span>
            <h1>La route vers<br />votre <em>prochaine</em><br />voiture commence ici.</h1>
            <p>Des véhicules choisis. Des enchères transparentes. À vous de prendre le volant.</p>
            <a className="button button-light" href="#vehicules">
              Voir les enchères <ArrowDownUp size={16} />
            </a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-light" />
            <div className="hero-car-card">
              <div className="hero-car-top"><span>AUCTION CLUB</span><Sparkles size={16} /></div>
              <CarFront className="hero-car-icon" strokeWidth={0.8} />
              <div className="hero-car-bottom"><span>YOUR NEXT STORY</span><span>01 / 04</span></div>
            </div>
            <span className="hero-art-label">DRIVE SOMETHING<br />WORTH TALKING ABOUT.</span>
          </div>
          <div className="hero-bottom">
            <span>UN NOUVEAU REGARD SUR L’AUTOMOBILE</span>
            <span>01 — 03</span>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Nos engagements">
        <div><ShieldCheck size={19} /><span>Enchères transparentes</span></div>
        <span className="trust-divider" />
        <div><CarFront size={19} /><span>Véhicules détaillés</span></div>
        <span className="trust-divider" />
        <div><Gavel size={19} /><span>Offres en temps réel</span></div>
      </section>

      <section className="inventory-section" id="vehicules">
        <div className="section-heading">
          <div>
            <span className="section-kicker">LE GARAGE</span>
            <h2>Des histoires à<br className="mobile-break" /> prendre en main<span className="heading-period">.</span></h2>
            <p>Parcourez les véhicules actuellement proposés aux enchères.</p>
          </div>
          {!loading && !error && (
            <div className="inventory-count">
              <strong>{String(auctions.length).padStart(2, '0')}</strong>
              <span>VÉHICULE{auctions.length === 1 ? '' : 'S'}<br />AU CATALOGUE</span>
            </div>
          )}
        </div>

        {!loading && !error && (
          <>
            <div className="inventory-toolbar">
              <div className="search-box">
                <Search size={18} />
                <input
                  aria-label="Rechercher un véhicule"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Marque, modèle, ville…"
                />
                {search && <button type="button" aria-label="Effacer la recherche" onClick={() => setSearch('')}><X size={16} /></button>}
              </div>
              <div className="filter-wrap">
                <SlidersHorizontal size={16} />
                <select aria-label="Filtrer les enchères" value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="all">Toutes les enchères</option>
                  <option value="open">Enchères en cours</option>
                </select>
                <ChevronDown size={15} className="select-chevron" />
              </div>
              <div className="auction-summary"><span className="live-dot" /> {openCount} EN COURS</div>
            </div>
            {startingFrom !== undefined && (
              <p className="catalog-context">Prix actuels à partir de <strong>{euro.format(startingFrom)}</strong></p>
            )}
          </>
        )}

        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={retry} />}
        {!loading && !error && filteredAuctions.length === 0 && (
          <EmptyState searching={Boolean(search) || filter !== 'all'} onReset={() => { setSearch(''); setFilter('all') }} />
        )}
        {!loading && !error && filteredAuctions.length > 0 && (
          <div className="auction-grid">
            {filteredAuctions.map((auction, index) => (
              <AuctionCard key={auctionIdOf(auction) ?? index} auction={auction} index={index} />
            ))}
          </div>
        )}
      </section>

      <section className="how-section" id="comment-ca-marche">
        <div className="how-intro">
          <span className="section-kicker">SIMPLE COMME UN TOUR DE CLÉ</span>
          <h2>Votre prochaine<br />histoire en <em>3 étapes.</em></h2>
          <p>Une expérience pensée pour que le plaisir commence avant même de démarrer.</p>
        </div>
        <div className="steps-list">
          <article className="step-item">
            <span className="step-number">01</span>
            <div><h3>Trouvez votre coup de cœur</h3><p>Explorez les véhicules disponibles et consultez les informations présentes sur chaque fiche.</p></div>
            <Search size={20} />
          </article>
          <article className="step-item">
            <span className="step-number">02</span>
            <div><h3>Faites votre offre</h3><p>Proposez un montant supérieur au prix actuel pour entrer dans la course.</p></div>
            <Gavel size={20} />
          </article>
          <article className="step-item">
            <span className="step-number">03</span>
            <div><h3>Suivez l’enchère</h3><p>Retrouvez le prix et les offres enregistrées directement depuis la fiche du véhicule.</p></div>
            <Timer size={20} />
          </article>
        </div>
      </section>
    </main>
  )
}

function BidForm({ auction, onBidPlaced }) {
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const price = currentPrice(auction)
  const open = isAuctionOpen(auction)
  const id = auctionIdOf(auction)
  const minimum = price === null ? null : price + 0.01

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback(null)
    setSubmitting(true)
    try {
      const result = await placeBid(id, {
        userId: Number(userId),
        amount: Number(amount),
      })
      setFeedback({
        type: 'success',
        message: result.message || 'Votre offre a été enregistrée.',
        warning: result.warning,
      })
      setAmount('')
      await onBidPlaced()
    } catch (error) {
      setFeedback({ type: 'error', message: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="bid-panel">
      <div className="bid-panel-heading">
        <span className="section-kicker">À VOUS DE JOUER</span>
        <h2>Faire une offre</h2>
        <p>La prochaine offre doit dépasser le prix actuel.</p>
      </div>
      {!open ? (
        <div className="bid-unavailable"><CircleAlert size={18} /> Cette enchère n’est pas ouverte aux offres.</div>
      ) : (
        <form className="bid-form" onSubmit={handleSubmit}>
          <label>
            Identifiant utilisateur
            <input
              type="number"
              min="1"
              step="1"
              required
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="Ex. 12"
              autoComplete="off"
            />
          </label>
          <label>
            Votre offre (€)
            <div className="amount-input-wrap">
              <span>€</span>
              <input
                type="number"
                min={minimum ?? 0.01}
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={minimum === null ? 'Montant' : minimum.toLocaleString('fr-FR')}
              />
            </div>
            {minimum !== null && <small>Minimum indicatif : {euro.format(minimum)}</small>}
          </label>
          <div className="auth-notice">
            <CircleAlert size={16} />
            <span>L’API ne vérifie pas encore l’identité du participant. N’utilisez qu’un identifiant utilisateur existant.</span>
          </div>
          {feedback && (
            <div className={`bid-feedback bid-feedback-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
              {feedback.type === 'success' ? <Check size={17} /> : <CircleAlert size={17} />}
              <span>{feedback.message}{feedback.warning ? ` (${feedback.warning})` : ''}</span>
            </div>
          )}
          <button className="button button-primary bid-submit" type="submit" disabled={submitting || !id}>
            {submitting ? <><span className="button-spinner" /> Envoi en cours…</> : <>Confirmer mon offre <ArrowRight size={17} /></>}
          </button>
        </form>
      )}
      <div className="bid-security"><ShieldCheck size={16} /><span>Offre vérifiée par l’API avant enregistrement</span></div>
    </section>
  )
}

function VehicleDetailsPage() {
  const { id } = useParams()
  const [auction, setAuction] = useState(null)
  const [bids, setBids] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bidsError, setBidsError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadedId, setLoadedId] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    async function loadAuction() {
      const results = await Promise.allSettled([
        getAuction(id, controller.signal),
        getBids(id, controller.signal),
      ])
      if (controller.signal.aborted) return

      if (results[0].status === 'rejected') {
        setError(results[0].reason.message)
        setAuction(null)
      } else {
        setError('')
        setAuction(results[0].value)
      }

      if (results[1].status === 'rejected') {
        setBidsError(results[1].reason.message)
        setBids([])
      } else if (Array.isArray(results[1].value)) {
        setBidsError('')
        setBids(results[1].value)
      } else {
        setBidsError('La réponse de GET /api/auctions/:id/bids doit être une liste JSON.')
        setBids([])
      }
      setLoadedId(id)
      setLoading(false)
    }
    loadAuction()
    return () => controller.abort()
  }, [id, refreshKey])

  function retry() {
    setLoading(true)
    setError('')
    setBidsError('')
    setRefreshKey((key) => key + 1)
  }

  if (loading || loadedId !== id) {
    return <main className="detail-page"><LoadingState detail /></main>
  }

  if (error || !auction || typeof auction !== 'object' || Array.isArray(auction)) {
    return (
      <main className="detail-page">
        <Link className="back-link" to="/"><ArrowLeft size={16} /> Retour aux enchères</Link>
        <ErrorState message={error || 'La réponse de l’API ne contient pas de fiche véhicule valide.'} onRetry={retry} />
      </main>
    )
  }

  const title = auctionTitle(auction)
  const statusOpen = isAuctionOpen(auction)
  const price = currentPrice(auction)
  const year = firstValue(auction, ['year', 'vehicle_year', 'vehicleYear', 'annee'])
  const mileage = firstValue(auction, ['mileage', 'mileage_km', 'kilometrage', 'odometer'])
  const fuel = firstValue(auction, ['fuel_type', 'fuel', 'carburant'])
  const transmission = firstValue(auction, ['transmission', 'gearbox', 'boite'])
  const location = firstValue(auction, ['location', 'city', 'ville'])
  const description = firstValue(auction, ['description', 'details', 'notes'])

  return (
    <main className="detail-page">
      <Link className="back-link" to="/"><ArrowLeft size={16} /> Retour aux enchères</Link>
      <section className="detail-top">
        <div className="detail-image-wrap">
          <VehicleImage auction={auction} className="detail-vehicle-image" />
          <span className={statusOpen ? 'status-pill status-open' : 'status-pill status-closed'}>
            <span className="status-dot" />{statusOpen ? 'Enchère en cours' : String(firstValue(auction, ['status', 'state']) || 'Statut indisponible')}
          </span>
          <span className="detail-image-caption">RÉF. {auctionIdOf(auction) ?? id}</span>
        </div>
        <div className="detail-summary">
          <span className="section-kicker">FICHE VÉHICULE · N° {auctionIdOf(auction) ?? id}</span>
          <h1>{title}</h1>
          <div className="detail-location">{location ? <><MapPin size={16} /> {location}</> : 'Véhicule proposé aux enchères'}</div>
          <div className="detail-price-card">
            <span>PRIX ACTUEL</span>
            <strong>{formatPrice(price)}</strong>
            <small>{statusOpen ? 'Enchère ouverte' : 'Enchère non ouverte'}</small>
          </div>
          <div className="detail-quick-specs">
            {year && <div><CalendarDays size={17} /><span><small>ANNÉE</small><strong>{year}</strong></span></div>}
            {mileage && <div><Gauge size={17} /><span><small>KILOMÉTRAGE</small><strong>{Number(mileage).toLocaleString('fr-FR')} km</strong></span></div>}
            {fuel && <div><Fuel size={17} /><span><small>ÉNERGIE</small><strong>{fuel}</strong></span></div>}
            {transmission && <div><ArrowDownUp size={17} /><span><small>TRANSMISSION</small><strong>{transmission}</strong></span></div>}
          </div>
          <button className="button button-primary detail-bid-cta" type="button" onClick={() => document.getElementById('faire-une-offre')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            <Gavel size={17} /> Faire une offre <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="detail-lower">
        <div className="detail-information">
          <div className="detail-section-heading">
            <div><span className="section-kicker">EN DÉTAIL</span><h2>À propos de ce véhicule</h2></div>
          </div>
          {description ? <p className="vehicle-description">{description}</p> : <p className="vehicle-description muted-description">Aucune description n’est disponible pour ce véhicule dans les données de l’API.</p>}
          <div className="vehicle-data-grid">
            {Object.entries(auction)
              .filter(([key, value]) => value !== null && value !== '' && typeof value !== 'object' && !/password|token|secret/i.test(key))
              .map(([key, value]) => (
                <div className="vehicle-data-item" key={key}>
                  <span>{key.replaceAll('_', ' ')}</span>
                  <strong>{String(value)}</strong>
                </div>
              ))}
          </div>

          <div className="bids-section">
            <div className="detail-section-heading">
              <div><span className="section-kicker">LA COURSE</span><h2>Historique des offres</h2></div>
              <span className="bids-count">{bids.length} offre{bids.length === 1 ? '' : 's'}</span>
            </div>
            {bidsError ? (
              <div className="inline-error" role="alert"><CircleAlert size={17} /> Historique indisponible : {bidsError}</div>
            ) : bids.length === 0 ? (
              <div className="bids-empty"><Gavel size={20} /><span>Aucune offre enregistrée pour le moment.</span></div>
            ) : (
              <div className="bids-table-wrap">
                <table className="bids-table">
                  <thead><tr><th>PARTICIPANT</th><th>MONTANT</th><th>DATE</th></tr></thead>
                  <tbody>
                    {[...bids].reverse().map((bid, index) => {
                      const bidder = firstValue(bid, ['user_id', 'userId', 'bidder_id', 'bidderId'])
                      const date = formatDate(firstValue(bid, ['created_at', 'createdAt', 'date']))
                      const bidAmount = firstValue(bid, ['amount', 'bid_amount', 'bidAmount'])
                      return (
                        <tr key={firstValue(bid, ['id', 'bid_id']) ?? index}>
                          <td>Participant {bidder ?? '—'}</td>
                          <td className="bid-amount">{formatPrice(bidAmount === null ? null : Number(bidAmount))}</td>
                          <td>{date || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="detail-aside" id="faire-une-offre">
          <BidForm
            auction={auction}
            onBidPlaced={() => {
              setRefreshKey((key) => key + 1)
            }}
          />
          <div className="aside-note"><ShieldCheck size={17} /><p>Les offres sont vérifiées par le serveur : montant supérieur au prix actuel et enchère ouverte.</p></div>
        </div>
      </section>
    </main>
  )
}

function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <main className="not-found-page">
      <span className="section-kicker">SORTIE DE ROUTE</span>
      <h1>Cette page n’existe pas<span className="heading-period">.</span></h1>
      <p>Le lien recherché ne correspond à aucune page de cette application.</p>
      <button className="button button-primary" type="button" onClick={() => navigate('/')}>Retour aux enchères <ArrowRight size={16} /></button>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/vehicles/:id" element={<VehicleDetailsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
