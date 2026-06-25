import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { FilterParams } from '../types';

interface SearchFiltersProps {
  filters: FilterParams;
  setFilters: React.Dispatch<React.SetStateAction<FilterParams>>;
  cameraModels: string[];
  onReset: () => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  setFilters,
  cameraModels,
  onReset,
}) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      hasGps: e.target.checked ? 'true' : 'all'
    }));
  };

  return (
    <div className="glass-panel filter-form">
      <h3 className="filter-title">
        <Filter size={18} className="text-cyan-400" /> Filters
      </h3>
      
      {/* Text search */}
      <div className="filter-group">
        <label className="filter-label" htmlFor="q">Search</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            id="q"
            name="q"
            value={filters.q}
            onChange={handleChange}
            placeholder="Search filename or model..."
            className="input-text"
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search 
            size={16} 
            className="text-muted" 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)' 
            }} 
          />
        </div>
      </div>

      {/* Camera Model filter */}
      <div className="filter-group">
        <label className="filter-label" htmlFor="cameraModel">Camera Model</label>
        <select
          id="cameraModel"
          name="cameraModel"
          value={filters.cameraModel}
          onChange={handleChange}
          className="select-custom"
        >
          <option value="">All Models</option>
          {cameraModels.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>

      {/* Date taken range */}
      <div className="filter-group">
        <label className="filter-label">Date Taken Range</label>
        <div className="date-range-row">
          <div>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleChange}
              className="input-text"
              aria-label="Start Date"
            />
          </div>
          <div>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleChange}
              className="input-text"
              aria-label="End Date"
            />
          </div>
        </div>
      </div>

      {/* Has GPS checkbox */}
      <div className="filter-group" style={{ marginTop: '1.25rem' }}>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.hasGps === 'true'}
            onChange={handleCheckboxChange}
            className="checkbox-custom"
          />
          <span>Only show with GPS info</span>
        </label>
      </div>

      {/* Reset button */}
      <button 
        className="btn btn-secondary" 
        onClick={onReset}
        style={{ width: '100%', marginTop: '1rem' }}
      >
        <RotateCcw size={16} /> Reset Filters
      </button>
    </div>
  );
};
