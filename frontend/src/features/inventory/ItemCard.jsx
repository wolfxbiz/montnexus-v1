import { AlertTriangle, Package } from 'lucide-react'

function StockBar({ current, minimum }) {
  const pct = minimum > 0 ? Math.min((current / (minimum * 2)) * 100, 100) : 100
  const color = current <= 0 ? 'bg-red-500' : current <= minimum ? 'bg-yellow-400' : 'bg-green-400'
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function ItemCard({ item, onClick, onRestock, onConsume }) {
  const isLow = item.current_stock <= item.minimum_stock
  const isOut = item.current_stock <= 0

  const stockColor = isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-700'

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all ${isLow ? 'border-yellow-200 hover:border-yellow-300' : 'border-gray-100 hover:border-indigo-100'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isLow && <AlertTriangle size={12} className="text-yellow-500 shrink-0" />}
            <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
          </div>
          <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
            {item.category}
          </span>
        </div>
        {item.sku && (
          <p className="text-xs text-gray-400 shrink-0 ml-2">{item.sku}</p>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400">Stock</p>
            <p className={`text-xl font-bold ${stockColor}`}>
              {item.current_stock}
              <span className="text-xs font-normal text-gray-400 ml-1">{item.unit}</span>
            </p>
          </div>
          <p className="text-xs text-gray-400">min {item.minimum_stock}</p>
        </div>
        <StockBar current={item.current_stock} minimum={item.minimum_stock} />
      </div>

      {item.expiry_date && (
        <p className="text-xs text-gray-400 mt-2">Expires {item.expiry_date}</p>
      )}

      <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onRestock(item)}
          className="flex-1 text-xs py-1.5 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 font-medium transition-colors">
          + Restock
        </button>
        <button
          onClick={() => onConsume(item)}
          disabled={item.current_stock <= 0}
          className="flex-1 text-xs py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-40">
          − Consume
        </button>
      </div>
    </div>
  )
}
