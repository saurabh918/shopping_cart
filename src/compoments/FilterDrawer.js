import React, { useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from 'react-bootstrap'
import { AiOutlineClose, AiOutlineFilter } from 'react-icons/ai'
import { CartContext } from '../context/Context'
import { countActiveFilters } from '../utils/countActiveFilters'
import FilterControls from './FilterControls'
import './FilterDrawer.css'

const FilterDrawer = () => {
  const { filterState, filterDispatch } = useContext(CartContext)
  const [isOpen, setIsOpen] = useState(false)
  const drawerRef = useRef(null)
  const drawerId = useId()
  const titleId = useId()
  const descId = useId()
  const activeFilterCount = countActiveFilters(filterState)

  const closeDrawer = useCallback(() => {
    setIsOpen(false)
  }, [])

  const openDrawer = () => {
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeDrawer()
      }
    }

    document.addEventListener('keydown', handleEscape)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, closeDrawer])

  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const closeButton = drawerRef.current.querySelector('.filter-drawer__close')
      closeButton?.focus()
    }
  }, [isOpen])

  const drawerLayer = isOpen ? (
    <div className="filter-drawer-layer" aria-hidden={false}>
      <button
        type="button"
        className="filter-drawer__backdrop"
        aria-label="Close filters"
        onClick={closeDrawer}
      />
      <aside
        id={drawerId}
        ref={drawerRef}
        className="filter-drawer filter-drawer--open"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <header className="filter-drawer__header">
          <div className="filter-drawer__header-text">
            <h2 id={titleId} className="filter-drawer__title">
              Filters
            </h2>
            <p id={descId} className="filter-drawer__subtitle">
              Refine your results
            </p>
          </div>
          <button
            type="button"
            className="filter-drawer__close"
            aria-label="Close filters"
            onClick={closeDrawer}
          >
            <AiOutlineClose aria-hidden="true" />
          </button>
        </header>

        <div className="filter-drawer__scroll">
          <FilterControls layout="drawer" />
        </div>

        <footer className="filter-drawer__footer">
          <Button
            type="button"
            className="filter-drawer__clear"
            variant="outline-secondary"
            onClick={() => filterDispatch({ type: 'clearFilter' })}
          >
            Clear filters
          </Button>
        </footer>
      </aside>
    </div>
  ) : null

  return (
    <>
      <Button
        type="button"
        variant="outline-primary"
        className="filter-drawer-toggle"
        aria-label="Open product filters"
        aria-expanded={isOpen}
        aria-controls={drawerId}
        onClick={openDrawer}
      >
        <AiOutlineFilter className="filter-drawer-toggle__icon" aria-hidden="true" />
        <span>Filters</span>
        {activeFilterCount > 0 ? (
          <span className="filter-drawer-toggle__badge" aria-label={`${activeFilterCount} active filters`}>
            {activeFilterCount}
          </span>
        ) : null}
      </Button>

      {typeof document !== 'undefined' && drawerLayer
        ? createPortal(drawerLayer, document.body)
        : null}
    </>
  )
}

export default FilterDrawer
