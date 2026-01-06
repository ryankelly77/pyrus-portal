'use client'

import { useState } from 'react'
import { AdminHeader } from '@/components/layout'

type DateRange = 'all' | '12months' | '6months' | '3months'
type Period = 'monthly' | 'weekly' | 'daily'

export default function AdminRevenuePage() {
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [period, setPeriod] = useState<Period>('monthly')

  return (
    <>
      <AdminHeader
        title="Revenue / MRR"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Track your monthly recurring revenue and growth metrics</p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="revenue-filters">
          <div className="filter-group">
            <label>Date range</label>
            <select
              className="filter-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
            >
              <option value="all">All time</option>
              <option value="12months">Last 12 months</option>
              <option value="6months">Last 6 months</option>
              <option value="3months">Last 3 months</option>
            </select>
          </div>
          <div className="filter-group">
            <select
              className="filter-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="revenue-charts-grid">
          {/* MRR Chart */}
          <div className="revenue-chart-card">
            <div className="chart-header">
              <div>
                <span className="chart-label">MRR</span>
                <div className="chart-value">$4,934.00</div>
              </div>
              <div className="chart-actions">
                <button className="chart-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13"></path>
                    <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
                  </svg>
                </button>
                <button className="chart-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="7 17 17 7"></polyline>
                    <polyline points="7 7 17 7 17 17"></polyline>
                  </svg>
                </button>
              </div>
            </div>
            <div className="chart-body">
              <div className="chart-wrapper">
                <svg className="mrr-chart" viewBox="0 0 470 200" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="35" x2="470" y2="35" className="chart-grid-line" />
                  <line x1="0" y1="70" x2="470" y2="70" className="chart-grid-line" />
                  <line x1="0" y1="105" x2="470" y2="105" className="chart-grid-line" />
                  <line x1="0" y1="140" x2="470" y2="140" className="chart-grid-line" />
                  <line x1="0" y1="175" x2="470" y2="175" className="chart-grid-line" />

                  {/* MRR Step Line */}
                  <polyline
                    className="mrr-line"
                    points="0,190 80,190 80,175 120,175 120,155 180,155 180,120 220,120 220,85 280,85 280,55 340,55 340,45 400,45 400,40 470,40"
                  />
                </svg>
                <div className="chart-y-axis">
                  <span>$6K</span>
                  <span>$5K</span>
                  <span>$4K</span>
                  <span>$3K</span>
                  <span>$2K</span>
                  <span>$1K</span>
                </div>
              </div>
              <div className="chart-x-axis">
                <span>Jan 1, 2024</span>
                <span>Jul 1, 2024</span>
                <span>Jan 1, 2025</span>
                <span>Jul 1, 2025</span>
              </div>
            </div>
          </div>

          {/* MRR Growth Chart */}
          <div className="revenue-chart-card">
            <div className="chart-header">
              <div>
                <span className="chart-label">MRR growth</span>
                <div className="chart-value">$4,934.00</div>
              </div>
              <div className="chart-actions">
                <button className="chart-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="7 17 17 7"></polyline>
                    <polyline points="7 7 17 7 17 17"></polyline>
                  </svg>
                </button>
              </div>
            </div>
            <div className="chart-body">
              <div className="chart-wrapper">
                <svg className="mrr-growth-chart" viewBox="0 0 470 200" preserveAspectRatio="none">
                  {/* Zero line */}
                  <line x1="0" y1="140" x2="470" y2="140" className="chart-zero-line" />

                  {/* Bars */}
                  <rect x="200" y="100" width="25" height="40" className="bar-positive" />
                  <rect x="240" y="40" width="25" height="100" className="bar-positive" />
                  <rect x="280" y="80" width="25" height="60" className="bar-positive" />
                  <rect x="320" y="100" width="25" height="40" className="bar-positive" />
                  <rect x="360" y="110" width="25" height="30" className="bar-positive" />
                  <rect x="400" y="120" width="25" height="20" className="bar-positive" />
                  <rect x="440" y="140" width="25" height="25" className="bar-negative" />
                </svg>
                <div className="chart-y-axis">
                  <span>$3K</span>
                  <span>$2K</span>
                  <span>$1K</span>
                  <span>$0</span>
                  <span>-$1K</span>
                </div>
              </div>
              <div className="chart-x-axis">
                <span>Dec 2023</span>
                <span>Jun 2024</span>
                <span>Jan 2025</span>
                <span>Jul 2025</span>
                <span>Jan 2026</span>
              </div>
            </div>
          </div>

          {/* Net Volume Chart */}
          <div className="revenue-chart-card">
            <div className="chart-header">
              <div>
                <span className="chart-label">Net volume</span>
                <div className="chart-value">$38,284.24</div>
              </div>
              <div className="chart-actions">
                <button className="chart-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="7 17 17 7"></polyline>
                    <polyline points="7 7 17 7 17 17"></polyline>
                  </svg>
                </button>
              </div>
            </div>
            <div className="chart-body">
              <div className="chart-wrapper">
                <svg className="net-volume-chart" viewBox="0 0 470 200" preserveAspectRatio="none">
                  {/* Area fill */}
                  <path
                    className="area-fill"
                    d="M 0,190 L 0,190 L 100,188 L 150,185 L 200,180 L 250,160 L 300,120 L 350,80 L 400,50 L 450,35 L 470,30 L 470,190 Z"
                  />

                  {/* Line */}
                  <polyline
                    className="area-line"
                    points="0,190 100,188 150,185 200,180 250,160 300,120 350,80 400,50 450,35 470,30"
                  />
                </svg>
                <div className="chart-y-axis">
                  <span>$6K</span>
                  <span>$5K</span>
                  <span>$4K</span>
                  <span>$3K</span>
                  <span>$2K</span>
                  <span>$0</span>
                </div>
              </div>
              <div className="chart-x-axis">
                <span>Jan 2024</span>
                <span>Jul 2024</span>
                <span>Jan 2025</span>
                <span>Jan 2026</span>
              </div>
            </div>
          </div>

          {/* MRR Growth Rate Chart */}
          <div className="revenue-chart-card">
            <div className="chart-header">
              <div>
                <span className="chart-label">MRR growth rate</span>
                <div className="chart-value">0.0%</div>
              </div>
              <div className="chart-actions">
                <button className="chart-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13"></path>
                    <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
                  </svg>
                </button>
                <button className="chart-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="7 17 17 7"></polyline>
                    <polyline points="7 7 17 7 17 17"></polyline>
                  </svg>
                </button>
              </div>
            </div>
            <div className="chart-body">
              <div className="chart-wrapper">
                <svg className="growth-rate-chart" viewBox="0 0 470 200" preserveAspectRatio="none">
                  {/* Zero line */}
                  <line x1="0" y1="155" x2="470" y2="155" className="chart-zero-line" />

                  {/* Growth rate line */}
                  <polyline
                    className="rate-line"
                    points="0,155 100,155 150,155 200,140 250,100 280,30 300,120 350,140 400,150 450,155 470,155"
                  />
                </svg>
                <div className="chart-y-axis">
                  <span>250%</span>
                  <span>150%</span>
                  <span>100%</span>
                  <span>50%</span>
                  <span>0%</span>
                  <span>-50%</span>
                </div>
              </div>
              <div className="chart-x-axis">
                <span>Jan 1, 2024</span>
                <span>Jul 1, 2024</span>
                <span>Jan 1, 2025</span>
                <span>Jul 1, 2025</span>
              </div>
            </div>
          </div>
        </div>

        {/* Report Downloads Section */}
        <div className="report-downloads">
          <h2>Report downloads</h2>
          <div className="report-list">
            <div className="report-item">
              <div className="report-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span>Revenue Report - December 2025</span>
              </div>
              <button className="btn btn-secondary btn-sm">Download CSV</button>
            </div>
            <div className="report-item">
              <div className="report-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span>MRR Summary - Q4 2025</span>
              </div>
              <button className="btn btn-secondary btn-sm">Download CSV</button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .revenue-filters {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-group label {
          font-size: 13px;
          color: #6B7280;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #D4DCD2;
          border-radius: 6px;
          font-size: 13px;
          color: #1A1F16;
          background: white;
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: #885430;
        }

        .revenue-charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }

        .revenue-chart-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .chart-label {
          font-size: 13px;
          color: #6B7280;
          display: block;
          margin-bottom: 4px;
        }

        .chart-value {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }

        .chart-actions {
          display: flex;
          gap: 8px;
        }

        .chart-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F3F4F6;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          color: #6B7280;
          transition: all 0.15s;
        }

        .chart-btn:hover {
          background: #E5E7EB;
          color: #374151;
        }

        .chart-btn svg {
          width: 16px;
          height: 16px;
        }

        .chart-body {
          position: relative;
        }

        .chart-wrapper {
          position: relative;
          height: 200px;
          padding-left: 45px;
        }

        .chart-wrapper svg {
          width: 100%;
          height: 100%;
        }

        .chart-y-axis {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-size: 11px;
          color: #9CA3AF;
          width: 40px;
          text-align: right;
          padding-right: 8px;
        }

        .chart-x-axis {
          display: flex;
          justify-content: space-between;
          padding-left: 45px;
          padding-top: 8px;
          font-size: 11px;
          color: #9CA3AF;
        }

        :global(.chart-grid-line) {
          stroke: #E5E7EB;
          stroke-width: 1;
        }

        :global(.chart-zero-line) {
          stroke: #D1D5DB;
          stroke-width: 1;
        }

        :global(.mrr-line) {
          fill: none;
          stroke: #059669;
          stroke-width: 2;
        }

        :global(.bar-positive) {
          fill: #059669;
        }

        :global(.bar-negative) {
          fill: #EF4444;
        }

        :global(.area-fill) {
          fill: rgba(5, 150, 105, 0.15);
        }

        :global(.area-line) {
          fill: none;
          stroke: #059669;
          stroke-width: 2;
        }

        :global(.rate-line) {
          fill: none;
          stroke: #059669;
          stroke-width: 2;
        }

        .report-downloads {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 24px;
        }

        .report-downloads h2 {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
        }

        .report-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .report-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #F9FAFB;
          border-radius: 8px;
        }

        .report-info {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: #374151;
        }

        .report-info svg {
          width: 20px;
          height: 20px;
          color: #6B7280;
        }

        @media (max-width: 900px) {
          .revenue-charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
