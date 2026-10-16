import { forwardRef } from 'react'
import OntologyGraphCanvas from './OntologyGraphCanvas'

/**
 * Re-export OntologyGraphCanvas to ensure full backward compatibility
 * while delivering the authentic SVG FMCG Finance Ontology Graph experience.
 */
const ReactFlowOntologyCanvas = forwardRef(function ReactFlowOntologyCanvas(props, ref) {
  return <OntologyGraphCanvas {...props} ref={ref} />
})

export default ReactFlowOntologyCanvas
