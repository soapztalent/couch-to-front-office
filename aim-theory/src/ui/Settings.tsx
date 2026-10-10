import { useEffect, useRef } from "react";
import { GAME_LABEL, GAME_YAW, type GameId, cmPer360, sensFromCm } from "../sens/sensitivity";
import { drawCrosshair } from "../sim/draw";
import { withGame, type Settings as SettingsT } from "../persist/storage";

export function Settings(props: { settings: SettingsT; onChange: (s: SettingsT) => void; onBack: () => void }) {
  const s = props.settings;
  const cm = cmPer360(s.dpi, s.sens, s.yaw);
  const preview = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = preview.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 160;
    canvas.height = 160;
    ctx.fillStyle = "#07090d";
    ctx.fillRect(0, 0, 160, 160);
    drawCrosshair(ctx, 160, 160, s.crosshair);
  }, [s.crosshair]);

  function patch(partial: Partial<SettingsT>) {
    props.onChange({ ...s, ...partial });
  }

  return (
    <div className="shell">
      <header className="top">
        <div className="mark">
          <b>Settings</b>
          <span>Saved on this machine</span>
        </div>
        <button className="ghost-btn" onClick={props.onBack}>
          Back
        </button>
      </header>
      <div className="settings">
        <section className="panel">
          <h2>Sensitivity</h2>
          <p className="note">Switching games keeps your centimeters per 360 and rewrites the in-game sens number.</p>
          <label className="field">
            Game
            <select
              value={s.game}
              onChange={(e) => props.onChange(withGame(s, e.target.value as GameId))}
            >
              {Object.entries(GAME_LABEL).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
              <option value="custom">Custom yaw</option>
            </select>
          </label>
          <label className="field">
            DPI
            <input
              type="number"
              min={100}
              max={32000}
              value={s.dpi}
              onChange={(e) => {
                const dpi = Number(e.target.value);
                if (dpi > 0) patch({ dpi });
              }}
            />
          </label>
          <label className="field">
            In-game sens
            <input
              type="number"
              min={0.001}
              step={0.001}
              value={s.sens}
              onChange={(e) => {
                const sens = Number(e.target.value);
                if (sens > 0) patch({ sens });
              }}
            />
          </label>
          <label className="field">
            cm/360
            <input
              type="number"
              min={1}
              step={0.1}
              value={Number.isFinite(cm) ? cm.toFixed(2) : ""}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (next > 0) patch({ sens: Number(sensFromCm(s.dpi, next, s.yaw).toFixed(4)) });
              }}
            />
          </label>
          {s.game === "custom" ? (
            <label className="field">
              Yaw (degrees per count at sens 1)
              <input
                type="number"
                min={0.0001}
                step={0.0001}
                value={s.yaw}
                onChange={(e) => {
                  const yaw = Number(e.target.value);
                  if (yaw > 0) patch({ yaw });
                }}
              />
            </label>
          ) : (
            <p className="note">Yaw {s.yaw}. Fortnite uses the percent as the sens number, so 8 means 8%.</p>
          )}
          <p className="cm">{Number.isFinite(cm) ? `${cm.toFixed(1)} cm/360` : "—"}</p>
          <label className="field">
            Horizontal FOV {s.fov}°
            <input
              type="range"
              min={70}
              max={130}
              value={s.fov}
              onChange={(e) => patch({ fov: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            Coach volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.volume}
              onChange={(e) => patch({ volume: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            Hit sounds
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.sfx}
              onChange={(e) => patch({ sfx: Number(e.target.value) })}
            />
          </label>
          <p className="note">
            Counter-Strike widescreen is about 106° horizontal. Yaw constants: CS2 {GAME_YAW.cs2}, Valorant {GAME_YAW.valorant}.
          </p>
        </section>
        <section className="panel">
          <h2>Crosshair</h2>
          <div className="preview-wrap">
            <canvas ref={preview} />
          </div>
          <label className="field">
            Color
            <input type="color" value={s.crosshair.color} onChange={(e) => patch({ crosshair: { ...s.crosshair, color: e.target.value } })} />
          </label>
          <label className="field">
            Length {s.crosshair.length}
            <input type="range" min={2} max={20} value={s.crosshair.length} onChange={(e) => patch({ crosshair: { ...s.crosshair, length: Number(e.target.value) } })} />
          </label>
          <label className="field">
            Gap {s.crosshair.gap}
            <input type="range" min={0} max={16} value={s.crosshair.gap} onChange={(e) => patch({ crosshair: { ...s.crosshair, gap: Number(e.target.value) } })} />
          </label>
          <label className="field">
            Thickness {s.crosshair.thickness}
            <input type="range" min={1} max={6} value={s.crosshair.thickness} onChange={(e) => patch({ crosshair: { ...s.crosshair, thickness: Number(e.target.value) } })} />
          </label>
          <div className="checks">
            <label>
              <input type="checkbox" checked={s.crosshair.outline} onChange={(e) => patch({ crosshair: { ...s.crosshair, outline: e.target.checked } })} /> Outline
            </label>
            <label>
              <input type="checkbox" checked={s.crosshair.dot} onChange={(e) => patch({ crosshair: { ...s.crosshair, dot: e.target.checked } })} /> Center dot
            </label>
          </div>
          {s.crosshair.dot ? (
            <label className="field">
              Dot size {s.crosshair.dotSize}
              <input type="range" min={1} max={6} value={s.crosshair.dotSize} onChange={(e) => patch({ crosshair: { ...s.crosshair, dotSize: Number(e.target.value) } })} />
            </label>
          ) : null}
        </section>
      </div>
    </div>
  );
}
