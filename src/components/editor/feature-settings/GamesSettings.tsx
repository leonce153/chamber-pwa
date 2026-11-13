import type { FeatureSettingsProps, GamesSettingsData } from './types';
import { Gamepad2, Trophy, Volume2, Check } from 'lucide-react';

export function GamesSettings({ settings, onUpdateSettings }: FeatureSettingsProps) {
  const gamesSettings: GamesSettingsData = {
    selectedGames: settings.selectedGames as string[] ?? [],
    showHighScores: settings.showHighScores as boolean ?? true,
    enableSound: settings.enableSound as boolean ?? true
  };

  const availableGames = [
  { id: '2048', name: '2048', description: 'Slide tiles to combine numbers', category: 'Puzzle' },
  { id: 'snake', name: 'Snake', description: 'Classic snake game', category: 'Arcade' },
  { id: 'tetris', name: 'Tetris', description: 'Stack falling blocks', category: 'Puzzle' },
  { id: 'flappy', name: 'Flappy Bird', description: 'Navigate through pipes', category: 'Arcade' },
  { id: 'memory', name: 'Memory Match', description: 'Find matching pairs', category: 'Puzzle' },
  { id: 'sudoku', name: 'Sudoku', description: 'Classic number puzzle', category: 'Puzzle' },
  { id: 'minesweeper', name: 'Minesweeper', description: 'Clear the minefield', category: 'Strategy' },
  { id: 'breakout', name: 'Breakout', description: 'Break the bricks', category: 'Arcade' },
  { id: 'pacman', name: 'Pac-Man', description: 'Eat dots, avoid ghosts', category: 'Arcade' },
  { id: 'chess', name: 'Chess', description: 'Classic strategy game', category: 'Strategy' },
  { id: 'checkers', name: 'Checkers', description: 'Jump and capture', category: 'Strategy' },
  { id: 'wordle', name: 'Word Guess', description: 'Guess the daily word', category: 'Word' }];


  const toggleGame = (gameId: string) => {
    const isSelected = gamesSettings.selectedGames.includes(gameId);
    const newGames = isSelected ?
    gamesSettings.selectedGames.filter((id) => id !== gameId) :
    [...gamesSettings.selectedGames, gameId];
    onUpdateSettings({ selectedGames: newGames });
  };

  const categories = [...new Set(availableGames.map((g) => g.category))];

  return (
    <div data-ev-id="ev_917b293e98" className="p-6 flex flex-col gap-8">
      {/* Game Options */}
      <section data-ev-id="ev_9288b2b054">
        <h3 data-ev-id="ev_3f071d692d" className="text-lg font-semibold text-text mb-4">Game Options</h3>
        
        <div data-ev-id="ev_0c92aa1191" className="flex flex-col gap-3">
          <label data-ev-id="ev_47f041e085" className="flex items-start gap-4 cursor-pointer p-4 bg-surface-elevated rounded-xl">
            <Trophy className="w-5 h-5 text-muted mt-0.5" />
            <div data-ev-id="ev_22d8feb90a" className="flex-1">
              <span data-ev-id="ev_e69e4a7e1e" className="text-text font-medium">Show High Scores</span>
              <p data-ev-id="ev_740b2ff2f3" className="text-sm text-muted mt-0.5">Display leaderboard and personal best scores</p>
            </div>
            <div data-ev-id="ev_4a0eee7263"
            onClick={() => onUpdateSettings({ showHighScores: !gamesSettings.showHighScores })}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            gamesSettings.showHighScores ? 'bg-primary' : 'bg-background'}`
            }>

              <div data-ev-id="ev_62026c916c"
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              gamesSettings.showHighScores ? 'translate-x-5' : 'translate-x-0.5'}`
              } />

            </div>
          </label>

          <label data-ev-id="ev_f41fd56a8e" className="flex items-start gap-4 cursor-pointer p-4 bg-surface-elevated rounded-xl">
            <Volume2 className="w-5 h-5 text-muted mt-0.5" />
            <div data-ev-id="ev_6b7c6bffbd" className="flex-1">
              <span data-ev-id="ev_c12f06abdd" className="text-text font-medium">Enable Sound Effects</span>
              <p data-ev-id="ev_f314ae1241" className="text-sm text-muted mt-0.5">Play sounds during gameplay</p>
            </div>
            <div data-ev-id="ev_55f7387dee"
            onClick={() => onUpdateSettings({ enableSound: !gamesSettings.enableSound })}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
            gamesSettings.enableSound ? 'bg-primary' : 'bg-background'}`
            }>

              <div data-ev-id="ev_43e6d7ed64"
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              gamesSettings.enableSound ? 'translate-x-5' : 'translate-x-0.5'}`
              } />

            </div>
          </label>
        </div>
      </section>

      {/* Game Selection */}
      <section data-ev-id="ev_668be4e8e2">
        <div data-ev-id="ev_2c5f1efba9" className="flex items-center justify-between mb-4">
          <div data-ev-id="ev_13b92a914e">
            <h3 data-ev-id="ev_3d17725ede" className="text-lg font-semibold text-text">Available Games</h3>
            <p data-ev-id="ev_936e092aea" className="text-sm text-muted">Select which games to include in your app.</p>
          </div>
          <span data-ev-id="ev_bafbfc2a51" className="text-sm font-medium px-3 py-1 rounded-full bg-primary/20 text-primary">
            {gamesSettings.selectedGames.length} selected
          </span>
        </div>

        {categories.map((category) =>
        <div data-ev-id="ev_11569f7bc7" key={category} className="mb-6">
            <h4 data-ev-id="ev_00f10607ba" className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">{category}</h4>
            <div data-ev-id="ev_65e4aa0bd9" className="grid grid-cols-2 gap-3">
              {availableGames.
            filter((g) => g.category === category).
            map((game) => {
              const isSelected = gamesSettings.selectedGames.includes(game.id);
              return (
                <button data-ev-id="ev_cce3bfda1f"
                key={game.id}
                onClick={() => toggleGame(game.id)}
                className={`relative p-4 rounded-xl border-2 text-left transition-colors ${
                isSelected ?
                'border-primary bg-primary/5' :
                'border-border hover:border-primary/50'}`
                }>

                      {isSelected &&
                  <div data-ev-id="ev_26db3503d1" className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                  }
                      <div data-ev-id="ev_81bd0b7cbe" className="flex items-start gap-3">
                        <Gamepad2 className={`w-8 h-8 ${
                    isSelected ? 'text-primary' : 'text-muted'}`
                    } />
                        <div data-ev-id="ev_fbd970fb9c">
                          <p data-ev-id="ev_b8c60697ff" className="font-medium text-text">{game.name}</p>
                          <p data-ev-id="ev_32bb2c58d4" className="text-xs text-muted mt-0.5">{game.description}</p>
                        </div>
                      </div>
                    </button>);

            })}
            </div>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section data-ev-id="ev_f616ac20af" className="flex gap-3">
        <button data-ev-id="ev_c67da03b19"
        onClick={() => onUpdateSettings({ selectedGames: availableGames.map((g) => g.id) })}
        className="px-4 py-2 bg-surface-elevated hover:bg-border text-text font-medium rounded-lg border border-border transition-colors">

          Select All
        </button>
        <button data-ev-id="ev_3e7cbdfd0b"
        onClick={() => onUpdateSettings({ selectedGames: [] })}
        className="px-4 py-2 bg-surface-elevated hover:bg-border text-text font-medium rounded-lg border border-border transition-colors">

          Clear All
        </button>
      </section>
    </div>);

}