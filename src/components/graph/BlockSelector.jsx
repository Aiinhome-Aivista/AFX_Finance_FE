import { useState } from 'react'
import { ArrowRight, ChevronDown, Eye } from 'lucide-react'
import { Spinner } from '../common/States'

/** Step 3: choose which KG0 blocks to customise. The union of the chosen blocks seeds KG1. */
export default function BlockSelector({ blocks, selected, onChange, preview, onPreview, onConfirm, busy, confirmed }) {
  const [open, setOpen] = useState({})
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  const total = new Set(blocks.filter((b) => selected.includes(b.id)).flatMap((b) => b.node_keys)).size
  return (
   <></>
  )
}
