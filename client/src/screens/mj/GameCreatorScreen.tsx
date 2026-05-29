import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { Bonus, Game, GameType, RankingMode, SideMission, VoteConfig } from '@/types';
import { allBrackets } from '@/lib/scoring';
import { GamePoster } from '@/components/GamePoster';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Minus, Plus, Save, Trash2 } from 'lucide-react';

/**
 * État interne du form. Tout est string là où l'utilisateur tape pour éviter
 * les conversions chaotiques pendant la frappe ; on convertit au moment d'envoyer.
 */
type DraftMission = { id: string; label: string; reward: string };
type DraftBonus = { id: string; label: string; cost: string; description: string };
type DraftVote = {
  id: string;
  label: string;
  optionsMode: 'players' | 'custom';
  customOptions: { id: string; label: string }[];
};
type DraftBracket = { minPlayers: string; ranks: string[] };

type Draft = {
  id: string;
  idTouched: boolean;
  name: string;
  type: GameType;
  rankingMode: RankingMode;
  durationMin: string;
  minPlayers: string;
  maxPlayers: string;
  description: string;
  brackets: DraftBracket[];
  missions: DraftMission[];
  bonuses: DraftBonus[];
  votes: DraftVote[];
};

const INITIAL_DRAFT: Draft = {
  id: '',
  idTouched: false,
  name: '',
  type: 'gold',
  rankingMode: 'points',
  durationMin: '20',
  minPlayers: '4',
  maxPlayers: '8',
  description: '',
  brackets: [{ minPlayers: '0', ranks: ['2', '1', '0', '-1'] }],
  missions: [],
  bonuses: [],
  votes: [],
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

let tmpSeq = 0;
const tmpId = (prefix: string) => `${prefix}-tmp-${++tmpSeq}`;

export function GameCreatorScreen({
  onClose,
  initial,
}: {
  onClose: () => void;
  initial?: Game;
}) {
  const tournament = useStore((s) => s.tournament);
  const send = useStore((s) => s.send);
  const editing = !!initial;
  const originalId = initial?.id;
  const [draft, setDraft] = useState<Draft>(() =>
    initial ? draftFromGame(initial) : INITIAL_DRAFT
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const effectiveId = draft.idTouched && draft.id ? draft.id : slugify(draft.name);

  const preview: Game = useMemo(() => buildPreview(draft, effectiveId), [draft, effectiveId]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onDelete = async () => {
    if (!editing || !originalId) return;
    if (!confirm(`Supprimer définitivement "${initial!.name}" du catalogue ?`)) return;
    setError(null);
    setDeleting(true);
    try {
      const r = await fetch(`/api/catalog/games/${encodeURIComponent(originalId)}`, {
        method: 'DELETE',
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      if (tournament && tournament.catalog.some((g) => g.id === originalId)) {
        send({
          type: 'mj:catalog:set',
          payload: { games: tournament.catalog.filter((g) => g.id !== originalId) },
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  };

  const onSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = buildPayload(draft, effectiveId);
      const url = editing
        ? `/api/catalog/games/${encodeURIComponent(originalId!)}`
        : '/api/catalog/games';
      const r = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      const saved = (await r.json()) as Game;
      if (tournament) {
        const replaced = tournament.catalog.some(
          (g) => g.id === originalId || g.id === saved.id
        );
        const nextCatalog = replaced
          ? tournament.catalog.map((g) =>
              g.id === originalId || g.id === saved.id ? saved : g
            )
          : [...tournament.catalog, saved];
        send({ type: 'mj:catalog:set', payload: { games: nextCatalog } });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        <h2 className="text-lg font-semibold">
          {editing ? 'Éditer la fiche' : 'Créer un jeu'}
        </h2>
        <div className="w-[120px]" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,520px)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identité</CardTitle>
              <CardDescription>Nom du jeu et type (pièces ou élimination).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field id="name" label="Nom" required>
                <Input
                  id="name"
                  value={draft.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="ex: Skull"
                />
              </Field>
              <Field
                id="id"
                label="Identifiant"
                hint="Auto-généré depuis le nom. Modifiable, lettres/chiffres/tirets."
              >
                <Input
                  id="id"
                  value={effectiveId}
                  onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value, idTouched: true }))}
                  placeholder="auto"
                />
              </Field>
              <Field id="type" label="Type">
                <div className="flex gap-2">
                  <TypeButton
                    active={draft.type === 'gold'}
                    onClick={() => update('type', 'gold')}
                    label="Pièces (classement)"
                  />
                  <TypeButton
                    active={draft.type === 'elimination'}
                    onClick={() => update('type', 'elimination')}
                    label="Élimination (duel)"
                  />
                </div>
              </Field>

              {draft.type === 'gold' && (
                <Field
                  id="rankingMode"
                  label="Distribution des pièces"
                  hint="Par points : chaque joueur a un total éditable, classement et gains calculés via la formule. Distribution directe : le MJ saisit le delta de pièces par joueur, pas de formule (idéal pour les jeux d'équipe)."
                >
                  <div className="flex gap-2">
                    <TypeButton
                      active={draft.rankingMode === 'points'}
                      onClick={() => update('rankingMode', 'points')}
                      label="Par points (auto)"
                    />
                    <TypeButton
                      active={draft.rankingMode === 'manual'}
                      onClick={() => update('rankingMode', 'manual')}
                      label="Directe (MJ)"
                    />
                  </div>
                </Field>
              )}

              <div className="grid grid-cols-3 gap-3">
                <Field id="duration" label="Durée (min)">
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    max={600}
                    value={draft.durationMin}
                    onChange={(e) => update('durationMin', e.target.value)}
                  />
                </Field>
                <Field id="minP" label="Joueurs min">
                  <Input
                    id="minP"
                    type="number"
                    min={1}
                    max={50}
                    value={draft.minPlayers}
                    onChange={(e) => update('minPlayers', e.target.value)}
                  />
                </Field>
                <Field id="maxP" label="Joueurs max">
                  <Input
                    id="maxP"
                    type="number"
                    min={1}
                    max={50}
                    value={draft.maxPlayers}
                    onChange={(e) => update('maxPlayers', e.target.value)}
                  />
                </Field>
              </div>

              <Field id="desc" label="Description / règles" hint="Affichée sur l'affiche.">
                <Textarea
                  id="desc"
                  rows={4}
                  value={draft.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Le pitch et les règles du jeu en quelques phrases."
                />
              </Field>
            </CardContent>
          </Card>

          {draft.type === 'gold' && draft.rankingMode === 'points' && (
            <BracketsCard
              brackets={draft.brackets}
              onChange={(brackets) => update('brackets', brackets)}
            />
          )}

          <MissionsCard
            missions={draft.missions}
            onChange={(missions) => update('missions', missions)}
          />

          <BonusesCard
            bonuses={draft.bonuses}
            onChange={(bonuses) => update('bonuses', bonuses)}
          />

          <VotesCard votes={draft.votes} onChange={(votes) => update('votes', votes)} />

          <Card>
            <CardContent className="pt-6 space-y-3">
              {error && (
                <p className="text-sm text-destructive">
                  Erreur : {error}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={onSubmit} disabled={saving || deleting || !draft.name.trim()}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editing ? 'Enregistrer les modifications' : 'Enregistrer le jeu'}
                </Button>
                <Button variant="ghost" onClick={onClose} disabled={saving || deleting}>
                  Annuler
                </Button>
                {editing && (
                  <Button
                    variant="ghost"
                    onClick={onDelete}
                    disabled={saving || deleting}
                    className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Supprimer ce jeu
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Sauvegardé dans <code>server/data/games.json</code>
                {editing
                  ? ' et propagé au catalogue du tournoi en cours.'
                  : ' et ajouté au catalogue du tournoi en cours.'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-2">
            Aperçu de l'affiche
          </p>
          <GamePoster game={preview} variant="compact" />
        </div>
      </div>
    </div>
  );
}

// --- sous-composants ----------------------------------------------------

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TypeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-primary bg-primary/10 text-foreground'
          : 'bg-card text-muted-foreground hover:bg-accent'
      }`}
    >
      {label}
    </button>
  );
}

function BracketsCard({
  brackets,
  onChange,
}: {
  brackets: DraftBracket[];
  onChange: (next: DraftBracket[]) => void;
}) {
  const patchBracket = (idx: number, patch: Partial<DraftBracket>) =>
    onChange(brackets.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  const patchRanks = (idx: number, ranks: string[]) => patchBracket(idx, { ranks });
  const removeBracket = (idx: number) => onChange(brackets.filter((_, i) => i !== idx));
  const addBracket = () => {
    const last = brackets[brackets.length - 1];
    const nextMin = last ? Math.max(0, (Number(last.minPlayers) || 0) + 2) : 0;
    onChange([
      ...brackets,
      { minPlayers: String(nextMin), ranks: last ? [...last.ranks] : ['2', '1', '0', '-1'] },
    ]);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Formule de gains</CardTitle>
        <CardDescription>
          Pièces gagnées/perdues selon le rang final. Plusieurs tranches possibles selon le nombre
          de participants ; la tranche active est la dernière dont le seuil est atteint.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {brackets.map((b, idx) => (
          <div key={idx} className="rounded-md border bg-card/50 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                À partir de
              </Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={b.minPlayers}
                onChange={(e) => patchBracket(idx, { minPlayers: e.target.value })}
                className="w-20 h-8"
              />
              <span className="text-sm text-muted-foreground">joueurs</span>
              <Button
                size="icon"
                variant="ghost"
                className="ml-auto h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeBracket(idx)}
                disabled={brackets.length <= 1}
                aria-label="Supprimer la tranche"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {b.ranks.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 rounded-md border bg-background px-2 py-1"
                >
                  <span className="text-xs text-muted-foreground">#{i + 1}</span>
                  <Input
                    type="number"
                    value={v}
                    onChange={(e) => {
                      const next = [...b.ranks];
                      next[i] = e.target.value;
                      patchRanks(idx, next);
                    }}
                    className="w-16 h-7 px-2 py-0 text-sm"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => patchRanks(idx, b.ranks.filter((_, j) => j !== i))}
                    disabled={b.ranks.length <= 1}
                    aria-label={`Retirer le rang #${i + 1}`}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => patchRanks(idx, [...b.ranks, '0'])}
              >
                <Plus className="h-3 w-3" /> Rang
              </Button>
            </div>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addBracket}>
          <Plus className="h-3 w-3" /> Tranche
        </Button>
      </CardContent>
    </Card>
  );
}

function MissionsCard({
  missions,
  onChange,
}: {
  missions: DraftMission[];
  onChange: (next: DraftMission[]) => void;
}) {
  const update = (idx: number, patch: Partial<DraftMission>) => {
    onChange(missions.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Missions annexes</CardTitle>
        <CardDescription>Objectifs ponctuels qui rapportent des pièces.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {missions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune mission.</p>
        ) : (
          <ul className="space-y-2">
            {missions.map((m, i) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2">
                <Input
                  className="flex-1 min-w-[200px]"
                  placeholder="Libellé de la mission"
                  value={m.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                />
                <Input
                  type="number"
                  className="w-20"
                  placeholder="récompense"
                  value={m.reward}
                  onChange={(e) => update(i, { reward: e.target.value })}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Supprimer mission"
                  onClick={() => onChange(missions.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([...missions, { id: tmpId('m'), label: '', reward: '1' }])
          }
        >
          <Plus className="h-3 w-3" /> Mission
        </Button>
      </CardContent>
    </Card>
  );
}

function BonusesCard({
  bonuses,
  onChange,
}: {
  bonuses: DraftBonus[];
  onChange: (next: DraftBonus[]) => void;
}) {
  const update = (idx: number, patch: Partial<DraftBonus>) => {
    onChange(bonuses.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bonus achetables</CardTitle>
        <CardDescription>Effets payants pendant la partie.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {bonuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun bonus.</p>
        ) : (
          <ul className="space-y-2">
            {bonuses.map((b, i) => (
              <li key={b.id} className="space-y-1.5 rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="flex-1 min-w-[200px]"
                    placeholder="Libellé du bonus"
                    value={b.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    className="w-20"
                    placeholder="coût"
                    value={b.cost}
                    onChange={(e) => update(i, { cost: e.target.value })}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Supprimer bonus"
                    onClick={() => onChange(bonuses.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Description (optionnelle)"
                  value={b.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                />
              </li>
            ))}
          </ul>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([
              ...bonuses,
              { id: tmpId('b'), label: '', cost: '1', description: '' },
            ])
          }
        >
          <Plus className="h-3 w-3" /> Bonus
        </Button>
      </CardContent>
    </Card>
  );
}

function VotesCard({
  votes,
  onChange,
}: {
  votes: DraftVote[];
  onChange: (next: DraftVote[]) => void;
}) {
  const update = (idx: number, patch: Partial<DraftVote>) => {
    onChange(votes.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Votes</CardTitle>
        <CardDescription>
          Votes anonymes que tu pourras déclencher depuis le panel MJ.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {votes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun vote configuré.</p>
        ) : (
          <ul className="space-y-3">
            {votes.map((v, i) => (
              <li key={v.id} className="rounded-md border bg-card p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="flex-1 min-w-[200px]"
                    placeholder="Question du vote"
                    value={v.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Supprimer vote"
                    onClick={() => onChange(votes.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 text-sm">
                  <TypeButton
                    active={v.optionsMode === 'players'}
                    onClick={() => update(i, { optionsMode: 'players' })}
                    label="Options = joueurs vivants"
                  />
                  <TypeButton
                    active={v.optionsMode === 'custom'}
                    onClick={() => update(i, { optionsMode: 'custom' })}
                    label="Options libres"
                  />
                </div>
                {v.optionsMode === 'custom' && (
                  <div className="space-y-1.5">
                    {v.customOptions.map((o, j) => (
                      <div key={o.id} className="flex gap-2">
                        <Input
                          placeholder={`Option ${j + 1}`}
                          value={o.label}
                          onChange={(e) =>
                            update(i, {
                              customOptions: v.customOptions.map((x, k) =>
                                k === j ? { ...x, label: e.target.value } : x
                              ),
                            })
                          }
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Retirer option"
                          onClick={() =>
                            update(i, {
                              customOptions: v.customOptions.filter((_, k) => k !== j),
                            })
                          }
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        update(i, {
                          customOptions: [
                            ...v.customOptions,
                            { id: tmpId('opt'), label: '' },
                          ],
                        })
                      }
                    >
                      <Plus className="h-3 w-3" /> Option
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <Separator />
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([
              ...votes,
              {
                id: tmpId('v'),
                label: '',
                optionsMode: 'players',
                customOptions: [],
              },
            ])
          }
        >
          <Plus className="h-3 w-3" /> Vote
        </Button>
      </CardContent>
    </Card>
  );
}

// --- helpers de conversion draft → Game --------------------------------

function toInt(s: string, fallback: number): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

function buildPreview(draft: Draft, id: string): Game {
  const missions: SideMission[] = draft.missions
    .filter((m) => m.label.trim())
    .map((m) => ({ id: m.id, label: m.label.trim(), reward: toInt(m.reward, 0) }));

  const bonuses: Bonus[] = draft.bonuses
    .filter((b) => b.label.trim())
    .map((b) => ({
      id: b.id,
      label: b.label.trim(),
      cost: toInt(b.cost, 0),
      description: b.description.trim() || undefined,
    }));

  const votes: VoteConfig[] = draft.votes
    .filter((v) => v.label.trim())
    .map((v) => ({
      id: v.id,
      label: v.label.trim(),
      mode: 'anonymous-majority',
      options:
        v.optionsMode === 'players'
          ? 'players'
          : v.customOptions
              .filter((o) => o.label.trim())
              .map((o) => ({ id: o.id, label: o.label.trim() })),
    }));

  const game: Game = {
    id: id || 'nouveau-jeu',
    name: draft.name.trim() || 'Sans titre',
    type: draft.type,
    durationMin: toInt(draft.durationMin, 0),
    minPlayers: toInt(draft.minPlayers, 0),
    maxPlayers: toInt(draft.maxPlayers, 0),
    description: draft.description,
  };
  if (draft.type === 'gold') {
    game.rankingMode = draft.rankingMode;
    if (draft.rankingMode === 'points') {
      game.goldFormula = {
        brackets: draft.brackets
          .map((b) => ({
            minPlayers: Math.max(0, toInt(b.minPlayers, 0)),
            ranks: b.ranks.map((r) => toInt(r, 0)),
          }))
          .sort((a, b) => a.minPlayers - b.minPlayers),
      };
    }
  }
  if (missions.length) game.sideMissions = missions;
  if (bonuses.length) game.bonuses = bonuses;
  if (votes.length) game.votes = votes;
  return game;
}

function buildPayload(draft: Draft, id: string): unknown {
  const preview = buildPreview(draft, id);
  // Le serveur valide à nouveau ; on envoie tel quel.
  return preview;
}

function draftFromGame(g: Game): Draft {
  const brackets = allBrackets(g.goldFormula);
  return {
    id: g.id,
    idTouched: true,
    name: g.name,
    type: g.type,
    rankingMode: g.rankingMode ?? 'points',
    durationMin: String(g.durationMin),
    minPlayers: String(g.minPlayers),
    maxPlayers: String(g.maxPlayers),
    description: g.description ?? '',
    brackets:
      brackets.length > 0
        ? brackets.map((b) => ({
            minPlayers: String(b.minPlayers),
            ranks: b.ranks.map(String),
          }))
        : [{ minPlayers: '0', ranks: ['2', '1', '0', '-1'] }],
    missions: (g.sideMissions ?? []).map((m) => ({
      id: m.id,
      label: m.label,
      reward: String(m.reward),
    })),
    bonuses: (g.bonuses ?? []).map((b) => ({
      id: b.id,
      label: b.label,
      cost: String(b.cost),
      description: b.description ?? '',
    })),
    votes: (g.votes ?? []).map((v) => ({
      id: v.id,
      label: v.label,
      optionsMode: v.options === 'players' ? 'players' : 'custom',
      customOptions:
        v.options === 'players'
          ? []
          : v.options.map((o) => ({ id: o.id, label: o.label })),
    })),
  };
}
