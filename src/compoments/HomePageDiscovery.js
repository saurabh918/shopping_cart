import React, { useContext, useMemo } from 'react'
import { Button } from 'react-bootstrap'
import { CartContext } from '../context/Context'
import { useAssistantPanel } from './ShoppingAssistant/AssistantPanelContext'
import { getSidebarBrowseCategories } from '../utils/sidebarBrowseCategories'

const HomePageDiscovery = () => {
  const { state, filterDispatch } = useContext(CartContext)
  const { openAssistant } = useAssistantPanel()
  const browseCategories = useMemo(
    () => getSidebarBrowseCategories(state.product),
    [state.product],
  )

  const handleBrowseCategory = (term) => {
    filterDispatch({ type: 'filterBySearch', payload: term })
  }

  return (
    <div className="home-page__discovery">
      <div className="filter-assistant-promo">
        <p className="filter-assistant-promo__eyebrow">✨ Shop smarter</p>
        <p className="filter-assistant-promo__text">
          Need help finding the right product? Ask the Shopping Assistant using natural language.
        </p>
        <Button
          type="button"
          variant="outline-primary"
          className="filter-assistant-promo__btn"
          onClick={openAssistant}
        >
          Ask AI Assistant
        </Button>
      </div>

      {browseCategories.length > 0 ? (
        <nav className="filter-browse-categories" aria-label="Browse by category">
          <h3 className="filter-browse-categories__title">Browse by category</h3>
          <div className="filter-browse-categories__list">
            {browseCategories.map(({ label, term }) => (
              <button
                key={term}
                type="button"
                className="filter-browse-categories__link"
                onClick={() => handleBrowseCategory(term)}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
      ) : (
        <div className="filter-shopping-tips">
          <h3 className="filter-shopping-tips__title">Quick shopping tips</h3>
          <div className="filter-shopping-tips__list">
            <p>Compare star ratings before you buy.</p>
            <p>Check delivery time on each product card.</p>
            <p>Use stock filters to hide out-of-stock items.</p>
            <p>Combine filters to narrow your results.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePageDiscovery
