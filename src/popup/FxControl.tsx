import { useState, useMemo } from "react"
import { checkFilterDeviation, sendMessageToConfigSync, formatFilters } from "../utils/configUtils"
import { ThrottledTextInput } from "../comps/ThrottledTextInput"
import { Filters } from "./Filters"
import { Origin } from "./Origin"
import { GiAnticlockwiseRotation } from "react-icons/gi"
import { FaPowerOff, FaExchangeAlt } from "react-icons/fa"
import { getDefaultFx } from "../defaults"
import { Fx } from "../types"
import { produce } from "immer"
import { RegularTooltip } from "src/comps/RegularTooltip"
import "./FxControl.css"
import equal from "fast-deep-equal"

type FxControlProps = {
  live?: boolean,
  _elementFx: Fx,
  _backdropFx: Fx,
  enabled: boolean,
  handleChange: (elementFx: Fx, backdropFx: Fx) => void,
  className?: string
}

export function FxControl(props: FxControlProps) {
  const [backdropTab, setBackdropTab] = useState(false)
  const [transformTab, setTransformTab] = useState(false)

  const elementFx = props._elementFx || getDefaultFx()
  const backdropFx = props._backdropFx || getDefaultFx()

  const rawFx = backdropTab ? props._backdropFx : props._elementFx 
  const fx = backdropTab ? backdropFx : elementFx

  const setCurrent = (newValue?: Fx) => {
    // Use original value for unchanged
    props.handleChange(backdropTab ? props._elementFx : newValue, backdropTab ? newValue : props._backdropFx)
  }

  const active = useMemo(() => ({
    elemFilter:  checkFilterDeviation(elementFx.filters),
    elemTransform: checkFilterDeviation(elementFx.transforms),
    backdropFilter: checkFilterDeviation(backdropFx.filters),
    backdropTransform: checkFilterDeviation(backdropFx.transforms)
  }), [elementFx, backdropFx]) 

  const isEmpty = useMemo(() => (
    rawFx == null ? true : equal(rawFx, getDefaultFx())
  ), [rawFx])


  return (
    <div className={`FxControl ${props.className || ""}`}>

      {/* Target tabs */}
      <div className="tabs">
        <button className={`${!backdropTab ? "open" : ""} ${(active.elemFilter || active.elemTransform) ? "active" : ""}`} onClick={e => {
          setBackdropTab(false)
        }}>{gvar.gsm.token.element}</button>
        <button className={`${backdropTab ? "open" : ""} ${(active.backdropFilter || active.backdropTransform)  ? "active" : ""}`} onClick={e => {
          setBackdropTab(true)
        }}>{gvar.gsm.token.backdrop}</button>
      </div>

      <div className="controls">

        {/* Status */}
        <button className={fx.enabled ? "active" : "muted"} onClick={e => {
          setCurrent(produce(fx, d => {
            d.enabled = !d.enabled
          }))
        }}><FaPowerOff size={"1.07rem"}/></button>

        {/* Swap */}
        <button onClick={e => {
          props.handleChange(backdropFx, elementFx)
        }}><FaExchangeAlt size={"1.07rem"}/></button>

        {/* Reset */}
        <button className={isEmpty ? '' : 'active levelup'} onClick={e => {
          setCurrent(null)
        }}><GiAnticlockwiseRotation size={"1.07rem"}/></button>
      </div>

      {/* Query */}
      {!backdropTab && (
        <div className="query">
          <span>{gvar.gsm.token.query} <RegularTooltip align={"right"} title={gvar.gsm.token.queryTooltip}/></span>
          <ThrottledTextInput passInput={{placeholder: `video`}} value={fx.query || ""} onChange={v => {
            setCurrent(produce(fx, d => {
              d.query = v 
            }))
          }}/>
        </div>
      )}

      {/* Type tabs */}
      <div className="tabs">
        <button className={`${!transformTab ? "open" : ""} ${(backdropTab ? active.backdropFilter : active.elemFilter) ? "active" : ""}`} onClick={e => {
          setTransformTab(false)
        }}>{gvar.gsm.token.filters}</button>
        <button className={`${transformTab ? "open" : ""} ${(backdropTab ? active.backdropTransform : active.elemTransform)  ? "active" : ""}`} onClick={e => {
          setTransformTab(true)
        }}>{gvar.gsm.token.transforms}</button>
      </div>

      {/* Pivot */}
      {transformTab && (
        <Origin x={fx.originX || "center"} y={fx.originY || (backdropTab ? "top" : "center")} onChange={(x, y) => {

          setCurrent(produce(fx, d => {
            d.originX = x
            d.originY = y
          }))
        }}/>
      )}

      {/* Into pane */}
      {(props.live && !transformTab && gvar.tabInfo.url?.startsWith("http")) && (
        <div className="buttons">
          <button className="intoPane" disabled={!fx.enabled || !(backdropTab ? active.backdropFilter : active.elemFilter)} onClick={e => {
            const filter = formatFilters(fx.filters)
            if (!filter) return 
            setCurrent(produce(fx, d => {
              d.filters = getDefaultFx().filters
            }))
            sendMessageToConfigSync({type: "ADD_PANE", filter}, gvar.tabInfo.tabId, 0)
            setTimeout(() => {
              window.close()
            }, 50)
          }}>{gvar.gsm.token.intoPane}</button>
          <button onClick={e => {
            chrome.scripting.executeScript({target: {tabId: gvar.tabInfo.tabId, allFrames: false}, files: ["pageDraw.js"]})
          }}>{gvar.gsm.command.drawPage}</button>
        </div>
      )}

      {/* Filters */}
      <Filters filters={transformTab ? fx.transforms : fx.filters} onChange={newFilters => {
        setCurrent(produce(fx, d => {
          d[transformTab ? "transforms" : "filters"] = newFilters
          if (checkFilterDeviation(transformTab ? d.transforms : d.filters)) {
            d.enabled = true 
          }
        }))
      }}/>
    </div>
  )
}
