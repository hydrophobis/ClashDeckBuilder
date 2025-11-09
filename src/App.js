import React, { useState, useEffect } from 'react';
import { Swords, Shield, Zap, Crown, TrendingUp, AlertCircle, Sparkles, X, Search, ArrowRight } from 'lucide-react';

const ClashRoyaleDeckBuilder = () => {
  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fetchSource, setFetchSource] = useState('');
  const [fetchedSample, setFetchedSample] = useState([]);
  const [llmRaw, setLlmRaw] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterRarity, setFilterRarity] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('select');
  const [deckCreation, setDeckCreation] = useState({
    requiredCards: [],
    archetypes: [],
    characteristics: [],
    additionalRequest: '',
    generating: false,
    result: null
  });

  const TEMPLATES = [
    {
      id: 'hog-2-6',
      name: 'Hog Cycle (2.6)',
      archetype: 'Cycle',
      cards: ['Hog Rider','Ice Spirit','Skeletons','Cannon','Musketeer','Fireball','The Log','Ice Golem']
    },
    {
      id: 'golem-beatdown',
      name: 'Golem Beatdown',
      archetype: 'Beatdown',
      cards: ['Golem','Night Witch','Baby Dragon','Mega Minion','Tornado','Lightning','Miner','Electro Dragon']
    },
    {
      id: 'bridge-spam',
      name: 'Bridge Spam',
      archetype: 'Bridge Spam',
      cards: ['Battle Ram','Bandit','Electro Wizard','Poison','Inferno Dragon','Royal Ghost','Minions','Bats']
    },
    {
      id: 'x-bow-siege',
      name: 'X-Bow Siege',
      archetype: 'Siege',
      cards: ['X-Bow','Tesla','Knight','Archers','Ice Spirit','Rocket','Log','Skeletons']
    }
  ];

  const ARCHETYPE_OPTIONS = [
    { id: 'beatdown', name: 'Beatdown', desc: 'Heavy tanks supported by splash damage' },
    { id: 'cycle', name: 'Cycle', desc: 'Fast, cheap cards with quick win condition' },
    { id: 'control', name: 'Control', desc: 'Defensive play with counter-push opportunities' },
    { id: 'bridge-spam', name: 'Bridge Spam', desc: 'Aggressive pressure on both lanes' },
    { id: 'siege', name: 'Siege', desc: 'Long-range building win conditions' },
    { id: 'bait', name: 'Bait', desc: 'Force opponent to waste spells' },
    { id: 'glass-cannon', name: 'Glass Cannon', desc: 'High damage, fragile units' }
  ];

  const CHARACTERISTIC_OPTIONS = [
    { id: 'air-heavy', name: 'Air Heavy', desc: 'Focus on flying units' },
    { id: 'ground-heavy', name: 'Ground Heavy', desc: 'Focus on ground units' },
    { id: 'spell-heavy', name: 'Spell Heavy', desc: 'Multiple spell options' },
    { id: 'low-elixir', name: 'Low Elixir', desc: 'Average elixir under 3.0' },
    { id: 'high-elixir', name: 'High Elixir', desc: 'Average elixir over 4.0' },
    { id: 'splash-heavy', name: 'Splash Heavy', desc: 'Multiple area damage cards' },
    { id: 'building-focused', name: 'Building Focused', desc: 'Multiple defensive buildings' },
    { id: 'swarm-heavy', name: 'Swarm Heavy', desc: 'Multiple small unit swarms' },
    { id: 'anti-air', name: 'Anti-Air', desc: 'Strong air defense capabilities' },
    { id: 'tank-killer', name: 'Tank Killer', desc: 'High DPS single-target units' }
  ];

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await fetch('https://raw.githubusercontent.com/hydrophobis/ClashCards/refs/heads/main/cards.json');
        console.log('Fetch response:', response);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        const data = json || [];

        const playableCards = data.filter(card =>
          card.elixirCost !== undefined &&
          card.rarity &&
          card.name
        ).map(card => ({
          ...card,
          elixir: card.elixirCost,
          key: card.id,
          type: card.rarity === 'common' || card.rarity === 'rare' || card.rarity === 'epic' ? 'Troop' : 'Troop',
        }));

        // playableCards.forEach(card => {
        //   if (card.maxEvolutionLevel) {
        //     playableCards.push({
        //       ...card,
        //       name: `Evo ${card.name}`,
        //       elixir: card.elixirCost,
        //       key: `${card.id}-evolution`,
        //       type: card.rarity === 'common' || card.rarity === 'rare' || card.rarity === 'epic' ? 'Troop' : 'Troop',
        //     });
        //   }
        // });

        playableCards.sort((a, b) => b.elixir - a.elixir || a.name.localeCompare(b.name));
        setCards(playableCards);
        setFetchSource('official-api');
        setFetchedSample(playableCards.slice(0, 6));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching cards:', error);
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  const toggleCard = (card) => {
    const evoCount = selectedCards.filter(c => c.isEvo).length;

    if (card.isEvo && evoCount >= 2 && !selectedCards.find(c => c.key === card.key)) {
      return; // block selecting more than 2 actual evolutions
    }

    const baseId = card.id;
    if (selectedCards.find(c => c.id === baseId)) {
      setSelectedCards(selectedCards.filter(c => c.id !== baseId));
    } else if (selectedCards.length < 8) {
      setSelectedCards([...selectedCards, card]);
    }
  };


  const clearDeck = () => {
    setSelectedCards([]);
    setAnalysis(null);
    setActiveTab('select');
  };

  const findCardByName = (cardName) => {
    if (!cardName) return undefined;
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const query = normalize(cardName);

    const ALIASES = {
      'cannon': 'Cannon',
      'inferno tower': 'Inferno Tower',
      'ice spirit': 'Ice Spirit',
      'skeletons': 'Skeletons',
    };

    if (ALIASES[query]) {
      const byAlias = cards.find(c => c.name.toLowerCase() === ALIASES[query].toLowerCase());
      if (byAlias) return byAlias;
    }

    const exact = cards.find(card => normalize(card.name) === query);
    if (exact) return exact;

    const idMatch = cards.find(card => (card.id?.toString() || card.key?.toString() || "").toLowerCase() === query.replace(/\s+/g, ''));
    if (idMatch) return idMatch;

    const wordRegex = new RegExp('\\b' + query.replace(/\s+/g, '\\b.*\\b') + '\\b');
    const candidates = cards.filter(card => {
      const n = normalize(card.name);
      return wordRegex.test(n) || n.includes(query);
    });

    if (candidates.length === 0) return undefined;

    candidates.sort((a, b) => {
      const la = a.name.length;
      const lb = b.name.length;
      const da = Math.abs(la - cardName.length);
      const db = Math.abs(lb - cardName.length);
      if (da !== db) return da - db;
      return la - lb;
    });

    return candidates[0];
  };

  const analyzeDeck = async () => {
    if (selectedCards.length !== 8) {
      alert('Please select exactly 8 cards for your deck');
      return;
    }

    setAnalyzing(true);
    setActiveTab('analysis');
    
    const computeCardTags = (c) => {
      const tags = [];
      const t = (c.type || '').toLowerCase();
      if (t.includes('spell')) tags.push('Spell');
      if (t.includes('troop') || t.includes('unit') || t.includes('character')) tags.push('Troop');
      if (t.includes('building')) tags.push('Building');
      if ((c.elixir ?? 0) <= 2) tags.push('Cycle');
      if ((c.elixir ?? 0) >= 5) tags.push('Heavy');
      if ((c.rarity || '').toLowerCase().includes('legend')) tags.push('Legendary');
      if ((c.rarity || '').toLowerCase().includes('epic')) tags.push('Epic');
      const nameLower = (c.name || '').toLowerCase();
      if (/hog|balloon|royal|golem|giant|pekka|lava|mega/i.test(nameLower)) tags.push('WinCondition');
      if (/inferno|mortar|tesla|cannon|bomb tower/i.test(nameLower)) tags.push('BuildingDef');
      if (/minion|musketeer|mega|minion horde|baby dragon|mega minion/i.test(nameLower)) tags.push('AirDefense');
      if (/wizard|valkyrie|baby dragon|executioner|bowler/i.test(nameLower)) tags.push('Splash');
      return Array.from(new Set(tags));
    };

    const deckDetails = selectedCards.map(c => {
      const tags = computeCardTags(c);
      return `${c.name} (${c.elixir} elixir, ${c.rarity}, Type: ${c.type}) Tags: [${tags.join(', ')}]`;
    }).join('\n');

    const avgElixir = (selectedCards.reduce((sum, c) => sum + c.elixir, 0) / 8).toFixed(1);
    const availableCards = cards.map(c => c.name).join(', ');

    const prompt = `You are an expert Clash Royale strategist with full understanding of all cards, archetypes, mechanics, elixir management, win conditions, cycle strategies, and the current meta. Analyze the provided deck and return **strict, valid JSON** following this schema:

{
  deckArchetype,
  archetypeConfidence,
  tags,
  strengths,
  weaknesses,
  missingElements,
  synergies,
  recommendedChanges,
  overallRating (1-10),
  cardReplacements:[{removeCard, addCard, reason, risk, elixirImpact}]
}

Input data:
- Deck list: ${deckDetails} (each card with full stats: name, type, rarity, elixir, damage, hitpoints, range, speed, special effects)
- Average Elixir: ${avgElixir}
- Available cards: ${availableCards}
- Context: Ladder 1v1, average opponent skill, meta includes X, Y, Z

Requirements for analysis:
1. **deckArchetype**: Identify archetype and justify based on card composition, win conditions, cycle, elixir curve, and meta relevance.
2. **archetypeConfidence**: Percentage (0-100%) reflecting archetype fit.
3. **tags**: Include tactical and strategic tags (e.g., WinCondition, Control, Cycle, SpellBait, Beatdown, Siege, AirDefense, GroundDefense, Splash, SpellSupport).
4. **strengths/weaknesses**: Be specific, reference card interactions, elixir advantages/disadvantages, and matchups against common archetypes.
5. **missingElements**: Highlight gaps in coverage (air, ground, splash, spell) that reduce effectiveness.
6. **synergies**: Note strong combinations, push potential, counterplay interactions.
7. **recommendedChanges**: Explain why certain cards could be replaced or added for optimal performance.
8. **overallRating**: Assign a number 1-10; briefly justify with deck strengths, weaknesses, and meta fit.
9. **cardReplacements**: Provide 0-4 actionable suggestions with:
   - removeCard: exact card name
   - addCard: exact card name
   - reason: concise, actionable rationale
   - risk: low/medium/high (consider elixir cost, matchup impact)
   - elixirImpact: numeric change in average elixir

Constraints:
- Preserve archetype identity.
- Maintain average elixir within ±0.4 unless justified.
- Prioritize replacements that synergize with the deck or correct weaknesses.
- Address meta-specific considerations (e.g., counters, cycle speed, win conditions).
- Return **strict, valid JSON only**; do not include commentary outside JSON.
- Avoid generic advice; provide detailed, actionable insights grounded in Clash Royale mechanics.
- Remember that a deck may only have TWO evolution cards; do not suggest adding more than that.
`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyBq2l0TqZn0YB88t50poqqFzCMMHchIEoY`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              required: ['deckArchetype', 'strengths', 'weaknesses'],
              properties: {
                deckArchetype: {
                  type: 'string',
                  enum: ['Bridge Spam', 'Beatdown', 'Control', 'Cycle', 'Siege', 'Bait', 'Glass Cannon', 'Hybrid']
                },
                archetypeConfidence: {
                  type: 'object',
                  properties: {
                    value: { type: 'number' },
                    archetype: { type: 'string' }
                  }
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' }
                },
                strengths: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                weaknesses: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                missingElements: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                synergies: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                recommendedChanges: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                overallRating: {
                  type: 'number'
                },
                commonCombinations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      cards: {
                        type: 'array',
                        items: {
                          type: 'string'
                        }
                      },
                      purpose: { type: 'string' }
                    }
                  }
                },
                cardReplacements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['removeCard', 'addCard', 'reason'],
                    properties: {
                      removeCard: {
                        type: 'string',
                        description: 'The name of the card to remove'
                      },
                      addCard: {
                        type: 'string',
                        description: 'The name of the card to add'
                      },
                      reason: {
                        type: 'string',
                        description: 'Reason for the replacement'
                      },
                      risk: {
                        type: 'string',
                        description: 'Risk level of the change'
                      }
                    }
                  }
                }
              }
            }
          }
        })
      });

      const data = await response.json();
      const findFirstJsonString = (obj, seen = new Set()) => {
        if (!obj || typeof obj !== 'object') return null;
        if (seen.has(obj)) return null;
        seen.add(obj);
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (typeof val === 'string') {
            const s = val.trim();
            if (s.startsWith('{') || s.startsWith('[')) return s;
          }
          if (typeof val === 'object') {
            const found = findFirstJsonString(val, seen);
            if (found) return found;
          }
        }
        return null;
      };

      setLlmRaw(JSON.stringify(data));

      let responseText = null;
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const content = data.candidates[0].content;
        if (content.parts && content.parts[0] && typeof content.parts[0].text === 'string') {
          responseText = content.parts[0].text;
        } else if (Array.isArray(content) && content[0] && content[0].parts && content[0].parts[0]) {
          responseText = content[0].parts[0].text;
        }
      }

      if (!responseText) responseText = findFirstJsonString(data) || null;

      if (!responseText) {
        console.error('Invalid response from Gemini API — no JSON text found', data);
        setAnalysis({ apiError: true, message: 'No JSON analysis returned from LLM', raw: data });
      } else {
        let analysisData = null;
        try {
          analysisData = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse LLM JSON, raw:', responseText, e);
          analysisData = { parseError: true, raw: responseText };
        }
        setAnalysis(analysisData);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setLlmRaw(error.message || String(error));
      setAnalysis({ apiError: true, message: String(error) });
      alert('Failed to analyze deck. Check Debug panel or console for details.');
    } finally {
      setAnalyzing(false);
    }
  };

  const applyReplacement = (removeCard, addCard) => {
    const cardToRemove = selectedCards.find(c => c.name.toLowerCase() === removeCard.toLowerCase());
    const cardToAdd = findCardByName(addCard);
    
    if (cardToRemove && cardToAdd) {
      const newDeck = selectedCards.filter(c => c.key !== cardToRemove.key);
      setSelectedCards([...newDeck, cardToAdd]);
      setAnalysis(null);
      setActiveTab('deck');
    }
  };

  const toggleRequiredCard = (card) => {
    const isRequired = deckCreation.requiredCards.find(c => c.key === card.key);
    if (isRequired) {
      setDeckCreation({
        ...deckCreation,
        requiredCards: deckCreation.requiredCards.filter(c => c.key !== card.key)
      });
    } else if (deckCreation.requiredCards.length < 6) {
      setDeckCreation({
        ...deckCreation,
        requiredCards: [...deckCreation.requiredCards, card]
      });
    }
  };

  const toggleArchetype = (archetypeId) => {
    const hasArchetype = deckCreation.archetypes.includes(archetypeId);
    if (hasArchetype) {
      setDeckCreation({
        ...deckCreation,
        archetypes: deckCreation.archetypes.filter(a => a !== archetypeId)
      });
    } else if (deckCreation.archetypes.length < 2) {
      setDeckCreation({
        ...deckCreation,
        archetypes: [...deckCreation.archetypes, archetypeId]
      });
    }
  };

  const toggleCharacteristic = (charId) => {
    const hasChar = deckCreation.characteristics.includes(charId);
    if (hasChar) {
      setDeckCreation({
        ...deckCreation,
        characteristics: deckCreation.characteristics.filter(c => c !== charId)
      });
    } else if (deckCreation.characteristics.length < 4) {
      setDeckCreation({
        ...deckCreation,
        characteristics: [...deckCreation.characteristics, charId]
      });
    }
  };

  const generateDeck = async () => {
    if (deckCreation.archetypes.length === 0) {
      alert('Please select at least one archetype');
      return;
    }

    setDeckCreation({ ...deckCreation, generating: true, result: null });

    const requiredCardsText = deckCreation.requiredCards.length > 0
      ? `Required cards (MUST include): ${deckCreation.requiredCards.map(c => c.name).join(', ')}`
      : 'No required cards';

    const archetypesText = `Archetypes: ${deckCreation.archetypes.join(', ')}`;
    const characteristicsText = deckCreation.characteristics.length > 0
      ? `Characteristics: ${deckCreation.characteristics.join(', ')}`
      : '';
    const additionalText = deckCreation.additionalRequest.trim()
      ? `Additional requirements: ${deckCreation.additionalRequest}`
      : '';

    const availableCards = cards.map(c => `${c.name} (${c.elixir} elixir, ${c.type}, ${c.rarity})`).join(', ');

    const prompt = `Create a competitive Clash Royale deck following these specifications. Return ONLY valid JSON (no markdown, no preamble):

${requiredCardsText}
${archetypesText}
${characteristicsText}
${additionalText}
${deckCreation.allowEvos ? '' : 'DO NOT include any evolution cards in the deck.'}

Available cards: ${availableCards}

Return JSON with this exact structure:
{
  "deckCards": ["Card Name 1", "Card Name 2", ...] (array of exactly 8 card names),
  "deckName": "Creative deck name",
  "primaryArchetype": "Main archetype",
  "averageElixir": number,
  "reasoning": {
    "overallStrategy": "2-3 sentences about the deck's game plan",
    "requiredCardsJustification": "Why the required cards work in this deck",
    "archetypeAlignment": "How the deck fulfills the archetype requirements",
    "characteristicsFulfillment": "How characteristics are incorporated",
    "cardChoices": [
      {
        "cardName": "Card Name",
        "role": "Role in deck",
        "synergies": "How it works with other cards",
        "reasoning": "Why this card was chosen"
      }
    ],
    "keyStrengths": ["strength 1", "strength 2", "strength 3"],
    "potentialWeaknesses": ["weakness 1", "weakness 2"],
    "gameplanSummary": "Detailed explanation of how to play this deck"
  }
}

CRITICAL: 
- Include ALL required cards in deckCards array
- Ensure exactly 8 cards total
- Consider elixir balance, spell coverage, air/ground defense
- Provide specific, detailed reasoning for every card choice
- You can ONLY include a MAXIMUM of TWO evolution cards in the deck
- Evolution cards can be included by prefixing the name with "Evo ", e.g. "Evo Knight"
- Evo cards should be the first to be included if required cards contain evolutions`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyBq2l0TqZn0YB88t50poqqFzCMMHchIEoY`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        })
      });

      const data = await response.json();
      
      let responseText = null;
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const content = data.candidates[0].content;
        if (content.parts && content.parts[0] && typeof content.parts[0].text === 'string') {
          responseText = content.parts[0].text;
        }
      }

      if (!responseText) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(responseText);
      
      const generatedCards = result.deckCards
        .map(name => findCardByName(name))
        .filter(Boolean);

      if (generatedCards.length !== 8) {
        throw new Error(`AI generated ${generatedCards.length} valid cards, expected 8`);
      }

      setDeckCreation({
        ...deckCreation,
        generating: false,
        result: {
          ...result,
          cards: generatedCards
        }
      });

    } catch (error) {
      console.error('Deck generation error:', error);
      alert('Failed to generate deck: ' + error.message);
      setDeckCreation({ ...deckCreation, generating: false });
    }
  };

  const loadGeneratedDeck = () => {
    if (deckCreation.result && deckCreation.result.cards) {
      setSelectedCards(deckCreation.result.cards);
      setAnalysis(null);
      setActiveTab('deck');
    }
  };

  const filteredCards = cards.filter(card => {
    const matchesType = filterType === 'all' || card.type.toLowerCase() === filterType;
    const matchesRarity = filterRarity === 'all' || card.rarity.toLowerCase() === filterRarity;
    const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesRarity && matchesSearch;
  });

  const avgElixir = selectedCards.length > 0 
    ? (selectedCards.reduce((sum, c) => sum + c.elixir, 0) / selectedCards.length).toFixed(1)
    : '0';

  const getRarityColor = (rarity) => {
    const colors = {
      'common': 'from-blue-400 to-blue-500',
      'rare': 'from-orange-500 to-orange-600',
      'epic': 'from-purple-500 to-purple-600',
      'legendary': 'from-pink-500 via-yellow-400 to-green-400',
      'champion': 'from-yellow-400 to-yellow-500'
    };
    return colors[rarity] || 'from-gray-500 to-gray-600';
  };


  const getTypeIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'troop': return '👥';
      case 'building': return '🏰';
      case 'spell': return '✨';
      default: return '⚡';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-3xl font-bold animate-pulse">Loading Cards...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 text-white">
      <div className="bg-gradient-to-r from-blue-800 to-purple-800 shadow-2xl p-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Crown className="w-10 h-10 text-yellow-400" />
              Clash Royale Deck Builder
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="bg-blue-700 bg-opacity-40 px-3 py-1 rounded-lg text-sm hover:bg-opacity-60"
              >
                {showDebug ? 'Hide Debug' : 'Show Debug'}
              </button>
            </div>
            <div className="flex gap-2 items-center bg-purple-700 px-4 py-2 rounded-lg">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-xl font-bold">Avg: {avgElixir}</span>
            </div>
          </div>

          <div className="bg-black bg-opacity-30 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-lg">Current Deck ({selectedCards.length}/8)</span>
              <div className="flex gap-2">
                {selectedCards.length > 0 && (
                  <button
                    onClick={clearDeck}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                )}
                <button
                  onClick={analyzeDeck}
                  disabled={selectedCards.length !== 8 || analyzing}
                  className={`px-4 py-1 rounded-lg text-sm font-bold flex items-center gap-1 transition-all ${
                    selectedCards.length === 8 && !analyzing
                      ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 animate-pulse'
                      : 'bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  {analyzing ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-8 gap-3">
              {selectedCards.map(card => (
                <div
                  key={card.key}
                  onClick={() => toggleCard(card)}
                  className="relative cursor-pointer transform hover:scale-110 transition-transform group"
                >
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full rounded-lg border-3 border-yellow-400 shadow-lg"
                  />
                  <div className="absolute top-1 right-1 bg-purple-600 rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm shadow-lg">
                    {card.elixir}
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-r ${getRarityColor(card.rarity)} text-xs text-center py-1 rounded-b-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity`}>
                    Remove
                  </div>
                </div>
              ))}
              {[...Array(8 - selectedCards.length)].map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-blue-700 bg-opacity-20 rounded-lg border-2 border-dashed border-blue-400 flex items-center justify-center hover:bg-opacity-30 transition-all">
                  <span className="text-blue-300 text-3xl opacity-50">+</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-blue-800 bg-opacity-50 rounded-t-xl p-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('select')}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'select'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg'
                  : 'bg-blue-700 bg-opacity-50 hover:bg-opacity-70'
              }`}
            >
              Select Cards
            </button>
            <button
              onClick={() => setActiveTab('deck')}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'deck'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg'
                  : 'bg-blue-700 bg-opacity-50 hover:bg-opacity-70'
              }`}
            >
              Deck Info
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg'
                  : 'bg-blue-700 bg-opacity-50 hover:bg-opacity-70'
              }`}
            >
              AI Create Deck
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                activeTab === 'templates'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg'
                  : 'bg-blue-700 bg-opacity-50 hover:bg-opacity-70'
              }`}
            >
              Templates
            </button>
            {analysis && (
              <>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`px-6 py-2 rounded-lg font-bold transition-all ${
                    activeTab === 'analysis'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg'
                      : 'bg-blue-700 bg-opacity-50 hover:bg-opacity-70'
                  }`}
                >
                  Analysis
                </button>
                {analysis.cardReplacements && analysis.cardReplacements.length > 0 && (
                  <button
                    onClick={() => setActiveTab('replacements')}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${
                      activeTab === 'replacements'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg'
                        : 'bg-blue-700 bg-opacity-50 hover:bg-opacity-70'
                    }`}
                  >
                    Replacements
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-blue-800 bg-opacity-50 rounded-b-xl p-6">
          {showDebug && (
            <div className="bg-black bg-opacity-20 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="text-sm text-gray-300">Fetch Source</div>
                  <div className="font-bold">{fetchSource || 'unknown'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-300">Fetched Sample</div>
                  <div className="text-sm text-gray-200">{fetchedSample.map(s => s.name).join(', ')}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-300">LLM Raw</div>
                  <div className="text-sm text-gray-200 truncate w-96">{llmRaw ? llmRaw.substring(0, 400) + (llmRaw.length > 400 ? '...' : '') : '—'}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'select' && (
            <>
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex-1 min-w-64 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search cards..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-blue-900 border border-blue-600 focus:outline-none focus:border-blue-400 text-white"
                  />
                </div>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-3 rounded-lg bg-blue-900 border border-blue-600 focus:outline-none focus:border-blue-400"
                >
                  <option value="all">All Types</option>
                  <option value="troop">Troops</option>
                  <option value="building">Buildings</option>
                  <option value="spell">Spells</option>
                </select>

                <select
                  value={filterRarity}
                  onChange={(e) => setFilterRarity(e.target.value)}
                  className="px-4 py-3 rounded-lg bg-blue-900 border border-blue-600 focus:outline-none focus:border-blue-400"
                >
                  <option value="all">All Rarities</option>
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                  <option value="champion">Champion</option>
                </select>
              </div>

              <div className="text-sm text-gray-300 mb-4">
                Showing {filteredCards.length} cards
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {filteredCards.map(card => {
                  const isSelected = selectedCards.find(c => c.id === card.id);
                  return (
                    <div
                      key={card.key}
                      onClick={() => toggleCard(card)}
                      className={`relative cursor-pointer transform hover:scale-105 transition-all ${
                        isSelected ? 'opacity-40 scale-95' : 'hover:shadow-xl'
                      }`}
                    >
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full rounded-lg border-2 border-blue-600"
                      />
                      <div className="absolute top-1 right-1 bg-purple-600 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-lg">
                        {card.elixir}
                      </div>
                      <div className="absolute top-1 left-1 text-lg">
                        {getTypeIcon(card.type)}
                      </div>
                      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-r ${getRarityColor(card.rarity)} text-xs text-center py-1 rounded-b-lg font-bold truncate px-1`}>
                        {card.name}
                      </div>
                      {isSelected && (
                        <div className="absolute inset-0 bg-green-500 bg-opacity-30 rounded-lg flex items-center justify-center">
                          <span className="text-white text-2xl font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold flex items-center gap-2">Deck Templates</h2>
              <p className="text-gray-300">Quick-start templates — preview and load into your deck.</p>

              <div className="grid md:grid-cols-2 gap-4">
                {TEMPLATES.map(t => {
                  const mappedCards = t.cards.map(name => findCardByName(name)).filter(Boolean);
                  const missing = t.cards.filter(name => !findCardByName(name));
                  const avg = mappedCards.length > 0 ? (mappedCards.reduce((s,c)=>s+(c.elixir||0),0)/mappedCards.length).toFixed(1) : '—';

                  return (
                    <div key={t.id} className="bg-black bg-opacity-30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-bold text-lg">{t.name}</div>
                          <div className="text-sm text-gray-300">{t.archetype} • Avg Elixir: {avg}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (missing.length > 0) {
                                alert(`Some cards not found: ${missing.join(', ')}. Template will load only found cards.`);
                              }
                              const cardsToLoad = t.cards.map(name => findCardByName(name)).filter(Boolean).slice(0,8);
                              setSelectedCards(cardsToLoad);
                              setAnalysis(null);
                              setActiveTab('deck');
                            }}
                            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg text-sm font-bold"
                          >
                            Load
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {t.cards.map((name, i) => {
                          const cd = findCardByName(name);
                          return (
                            <div key={i} className="flex flex-col items-center text-center text-xs">
                              {cd ? (
                                <>
                                  <img src={cd.imageUrl} alt={cd.name} className="w-16 h-16 rounded mb-1" />
                                  <div className="truncate w-20">{cd.name}</div>
                                </>
                              ) : (
                                <div className="w-16 h-16 bg-blue-700 bg-opacity-30 rounded mb-1 flex items-center justify-center">?</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'deck' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Deck Statistics</h2>
              
              {selectedCards.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-black bg-opacity-30 rounded-lg p-4">
                      <div className="text-sm text-gray-300">Avg Elixir</div>
                      <div className="text-3xl font-bold">{avgElixir}</div>
                    </div>
                    <div className="bg-black bg-opacity-30 rounded-lg p-4">
                      <div className="text-sm text-gray-300">Total Cards</div>
                      <div className="text-3xl font-bold">{selectedCards.length}/8</div>
                    </div>
                    <div className="bg-black bg-opacity-30 rounded-lg p-4">
                      <div className="text-sm text-gray-300">Spells</div>
                      <div className="text-3xl font-bold">
                        {selectedCards.filter(c => c.type === 'Spell').length}
                      </div>
                    </div>
                    <div className="bg-black bg-opacity-30 rounded-lg p-4">
                      <div className="text-sm text-gray-300">Buildings</div>
                      <div className="text-3xl font-bold">
                        {selectedCards.filter(c => c.type === 'Building').length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-black bg-opacity-30 rounded-lg p-4">
                    <h3 className="font-bold mb-3 text-xl">Card Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedCards.map(card => (
                        <div key={`${card.id}-${card.name}`} className="flex items-center gap-3 bg-blue-900 bg-opacity-50 p-3 rounded-lg">
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-16 h-16 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-lg font-bold">{card.name}</div>
                            <div className="text-sm text-gray-300">{card.type} • {card.rarity}</div>
                            <div className="text-sm text-yellow-400">{card.elixir} Elixir</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-300">
                  <Crown className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl">Start building your deck by selecting cards!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-yellow-400" />
                AI Deck Creator
              </h2>
              <p className="text-gray-300">Let AI build a competitive deck based on your requirements</p>

              <div className="bg-black bg-opacity-30 rounded-lg p-5">
                <h3 className="text-xl font-bold mb-3">Required Cards (Optional - Max 6)</h3>
                <p className="text-sm text-gray-300 mb-4">Select cards that MUST be included in the generated deck</p>
                
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 mb-4">
                  {deckCreation.requiredCards.map(card => (
                    <div
                      key={card.key}
                      onClick={() => toggleRequiredCard(card)}
                      className="relative cursor-pointer transform hover:scale-105 transition-all"
                    >
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full rounded-lg border-3 border-green-400 shadow-lg"
                      />
                      <div className="absolute top-1 right-1 bg-purple-600 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">
                        {card.elixir}
                      </div>
                      <div className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">✓</span>
                      </div>
                    </div>
                  ))}
                  {[...Array(6 - deckCreation.requiredCards.length)].map((_, i) => (
                    <div key={`empty-req-${i}`} className="aspect-square bg-green-700 bg-opacity-10 rounded-lg border-2 border-dashed border-green-400 flex items-center justify-center">
                      <span className="text-green-300 text-2xl opacity-50">+</span>
                    </div>
                  ))}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search cards to add as required..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-blue-900 border border-blue-600 focus:outline-none focus:border-blue-400 text-white mb-3"
                  />
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-64 overflow-y-auto">
                  {cards.filter(c => 
                    c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    !deckCreation.requiredCards.find(rc => rc.key === c.key)
                  ).slice(0, 40).map(card => (
                    <div
                      key={card.key}
                      onClick={() => toggleRequiredCard(card)}
                      className="relative cursor-pointer transform hover:scale-105 transition-all opacity-60 hover:opacity-100"
                    >
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full rounded-lg border border-blue-600"
                      />
                      <div className="absolute top-0.5 right-0.5 bg-purple-600 rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">
                        {card.elixir}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-black bg-opacity-30 rounded-lg p-5">
                <h3 className="text-xl font-bold mb-3">Deck Archetype (Select 1-2)</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ARCHETYPE_OPTIONS.map(archetype => {
                    const isSelected = deckCreation.archetypes.includes(archetype.id);
                    return (
                      <button
                        key={archetype.id}
                        onClick={() => toggleArchetype(archetype.id)}
                        className={`p-4 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg scale-105'
                            : 'bg-blue-900 bg-opacity-50 hover:bg-opacity-70'
                        }`}
                      >
                        <div className="font-bold text-lg mb-1">{archetype.name}</div>
                        <div className="text-sm text-gray-300">{archetype.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-black bg-opacity-30 rounded-lg p-5">
                <h3 className="text-xl font-bold mb-3">Additional Characteristics (Optional - Max 4)</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CHARACTERISTIC_OPTIONS.map(char => {
                    const isSelected = deckCreation.characteristics.includes(char.id);
                    return (
                      <button
                        key={char.id}
                        onClick={() => toggleCharacteristic(char.id)}
                        className={`p-3 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-green-600 to-blue-600 shadow-lg'
                            : 'bg-blue-900 bg-opacity-30 hover:bg-opacity-50'
                        }`}
                      >
                        <div className="font-bold mb-1">{char.name}</div>
                        <div className="text-xs text-gray-300">{char.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-black bg-opacity-30 rounded-lg p-5">
                <h3 className="text-xl font-bold mb-3">Additional Requirements (Optional)</h3>
                <textarea
                  value={deckCreation.additionalRequest}
                  onChange={(e) => setDeckCreation({ ...deckCreation, additionalRequest: e.target.value })}
                  placeholder="E.g., 'Include a small spell', 'Focus on counter-pushing', 'Avoid legendary cards', etc."
                  className="w-full h-24 p-4 rounded-lg bg-blue-900 border border-blue-600 focus:outline-none focus:border-blue-400 text-white resize-none"
                />

                {/* checkboxes */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={deckCreation.allowEvos}
                      onChange={() =>
                        setDeckCreation({ ...deckCreation, allowEvos: !deckCreation.allowEvos })
                      }
                      className="form-checkbox h-5 w-5 text-green-500"
                    />
                    <span>Allow Evolutions</span>
                  </label>
                </div>
              </div>

              <div className="bg-black bg-opacity-30 rounded-lg p-5 mb-5">
                <h3 className="text-xl font-bold mb-3">AI Configurations</h3>

              </div>


              <button
                onClick={generateDeck}
                disabled={deckCreation.generating || deckCreation.archetypes.length === 0}
                className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                  deckCreation.generating
                    ? 'bg-gray-600 cursor-not-allowed'
                    : deckCreation.archetypes.length === 0
                    ? 'bg-gray-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 shadow-lg animate-pulse'
                }`}
              >
                <Sparkles className="w-6 h-6" />
                {deckCreation.generating ? 'Generating Deck...' : 'Generate Deck'}
              </button>

              {deckCreation.result && (
                <div className="space-y-6 mt-8">
                  <div className="bg-gradient-to-r from-green-900 to-blue-900 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-yellow-400">{deckCreation.result.deckName}</h3>
                        <p className="text-gray-300">{deckCreation.result.primaryArchetype} • Avg Elixir: {deckCreation.result.averageElixir?.toFixed(1) || 'N/A'}</p>
                      </div>
                      <button
                        onClick={loadGeneratedDeck}
                        className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-6 py-3 rounded-lg font-bold flex items-center gap-2"
                      >
                        <ArrowRight className="w-5 h-5" />
                        Load Deck
                      </button>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-6">
                      {deckCreation.result.cards.map(card => (
                        <div key={card.key} className="relative">
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-full rounded-lg border-2 border-yellow-400 shadow-lg"
                          />
                          <div className="absolute top-1 right-1 bg-purple-600 rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
                            {card.elixir}
                          </div>
                        </div>
                      ))}
                    </div>

                    {deckCreation.result.reasoning && (
                      <div className="space-y-4">
                        <div className="bg-black bg-opacity-40 rounded-lg p-4">
                          <h4 className="font-bold text-lg mb-2 text-yellow-300">Overall Strategy</h4>
                          <p className="text-gray-200">{deckCreation.result.reasoning.overallStrategy}</p>
                        </div>

                        {deckCreation.requiredCards.length > 0 && deckCreation.result.reasoning.requiredCardsJustification && (
                          <div className="bg-black bg-opacity-40 rounded-lg p-4">
                            <h4 className="font-bold text-lg mb-2 text-green-300">Required Cards Integration</h4>
                            <p className="text-gray-200">{deckCreation.result.reasoning.requiredCardsJustification}</p>
                          </div>
                        )}

                        {deckCreation.result.reasoning.archetypeAlignment && (
                          <div className="bg-black bg-opacity-40 rounded-lg p-4">
                            <h4 className="font-bold text-lg mb-2 text-blue-300">Archetype Fulfillment</h4>
                            <p className="text-gray-200">{deckCreation.result.reasoning.archetypeAlignment}</p>
                          </div>
                        )}

                        {deckCreation.characteristics.length > 0 && deckCreation.result.reasoning.characteristicsFulfillment && (
                          <div className="bg-black bg-opacity-40 rounded-lg p-4">
                            <h4 className="font-bold text-lg mb-2 text-purple-300">Characteristics Implementation</h4>
                            <p className="text-gray-200">{deckCreation.result.reasoning.characteristicsFulfillment}</p>
                          </div>
                        )}

                        <div className="bg-black bg-opacity-40 rounded-lg p-4">
                          <h4 className="font-bold text-lg mb-3 text-yellow-300">Card-by-Card Analysis</h4>
                          <div className="space-y-3">
                            {deckCreation.result.reasoning.cardChoices?.map((choice, i) => (
                              <div key={i} className="bg-blue-900 bg-opacity-30 rounded-lg p-3">
                                <div className="font-bold text-yellow-400 mb-1">{choice.cardName}</div>
                                <div className="text-sm text-gray-300 mb-1"><span className="font-bold">Role:</span> {choice.role}</div>
                                <div className="text-sm text-gray-300 mb-1"><span className="font-bold">Synergies:</span> {choice.synergies}</div>
                                <div className="text-sm text-gray-200"><span className="font-bold">Why:</span> {choice.reasoning}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {deckCreation.result.reasoning.keyStrengths && (
                          <div className="bg-green-900 bg-opacity-40 rounded-lg p-4">
                            <h4 className="font-bold text-lg mb-2 text-green-300 flex items-center gap-2">
                              <Shield className="w-5 h-5" />
                              Key Strengths
                            </h4>
                            <ul className="space-y-1">
                              {deckCreation.result.reasoning.keyStrengths.map((strength, i) => (
                                <li key={i} className="flex gap-2 text-gray-200">
                                  <span className="text-green-400">✓</span>
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {deckCreation.result.reasoning.potentialWeaknesses && (
                          <div className="bg-red-900 bg-opacity-40 rounded-lg p-4">
                            <h4 className="font-bold text-lg mb-2 text-red-300 flex items-center gap-2">
                              <AlertCircle className="w-5 h-5" />
                              Potential Weaknesses
                            </h4>
                            <ul className="space-y-1">
                              {deckCreation.result.reasoning.potentialWeaknesses.map((weakness, i) => (
                                <li key={i} className="flex gap-2 text-gray-200">
                                  <span className="text-red-400">!</span>
                                  {weakness}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {deckCreation.result.reasoning.gameplanSummary && (
                          <div className="bg-black bg-opacity-40 rounded-lg p-4">
                            <h4 className="font-bold text-lg mb-2 text-yellow-300">How to Play This Deck</h4>
                            <p className="text-gray-200">{deckCreation.result.reasoning.gameplanSummary}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analysis' && analysis && (
            <div className="space-y-6">
              {(analysis.apiError || analysis.parseError) ? (
                <div className="bg-red-900 bg-opacity-50 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    Analysis Error
                  </h3>
                  <p className="text-gray-300 mb-4">{analysis.message || 'Failed to analyze deck. Please try again.'}</p>
                  {showDebug && analysis.raw && (
                    <div className="bg-black bg-opacity-30 p-4 rounded-lg">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                        {typeof analysis.raw === 'string' ? analysis.raw : JSON.stringify(analysis.raw, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-8 h-8" />
                    AI Deck Analysis
                  </h2>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-black bg-opacity-30 rounded-lg p-4 text-center">
                      <h3 className="text-sm text-yellow-300 mb-1">Archetype</h3>
                      <p className="text-2xl font-bold">{analysis.deckArchetype || 'Unknown'}</p>
                    </div>
                    <div className="bg-black bg-opacity-30 rounded-lg p-4 text-center">
                      <h3 className="text-sm text-yellow-300 mb-1">Rating</h3>
                      <p className="text-3xl font-bold text-green-400">{analysis.overallRating ?? '?'}/10</p>
                    </div>
                    <div className="bg-black bg-opacity-30 rounded-lg p-4 text-center">
                      <h3 className="text-sm text-yellow-300 mb-1">Meta Status</h3>
                      <p className="text-xl font-bold">{analysis.usageStats?.metaRelevance || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-green-900 bg-opacity-40 rounded-lg p-5">
                      <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-green-400" />
                        Strengths
                      </h3>
                      <ul className="space-y-2">
                        {(analysis.strengths || []).map((s, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-green-400 text-lg">✓</span>
                            <span>{s}</span>
                          </li>
                        ))}
                        {(!analysis.strengths || analysis.strengths.length === 0) && (
                          <li className="text-gray-400 italic">No strengths identified</li>
                        )}
                      </ul>
                    </div>

                    <div className="bg-red-900 bg-opacity-40 rounded-lg p-5">
                      <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                        Weaknesses
                      </h3>
                      <ul className="space-y-2">
                        {(analysis.weaknesses || []).map((w, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-red-400 text-lg">✗</span>
                            <span>{w}</span>
                          </li>
                        ))}
                        {(!analysis.weaknesses || analysis.weaknesses.length === 0) && (
                          <li className="text-gray-400 italic">No weaknesses identified</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-black bg-opacity-30 rounded-lg p-5">
                    <h3 className="text-xl font-bold mb-3">Missing Elements</h3>
                    <div className="flex flex-wrap gap-2">
                      {(analysis.missingElements || []).map((m, i) => (
                        <span key={i} className="bg-yellow-600 px-4 py-2 rounded-full">
                          {m}
                        </span>
                      ))}
                      {(!analysis.missingElements || analysis.missingElements.length === 0) && (
                        <span className="text-gray-400 italic">No missing elements identified</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-black bg-opacity-30 rounded-lg p-5">
                    <h3 className="text-xl font-bold mb-3">Card Synergies</h3>
                    <ul className="space-y-2">
                      {(analysis.synergies || []).map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Zap className="w-5 h-5 mt-1 text-yellow-400 flex-shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                      {(!analysis.synergies || analysis.synergies.length === 0) && (
                        <li className="text-gray-400 italic">No synergies identified</li>
                      )}
                    </ul>
                  </div>

                  {analysis.commonCombinations && analysis.commonCombinations.length > 0 && (
                    <div className="bg-black bg-opacity-30 rounded-lg p-5">
                      <h3 className="text-xl font-bold mb-3">Common Card Combinations</h3>
                      <div className="space-y-3">
                        {analysis.commonCombinations.map((combo, i) => (
                          <div key={i} className="bg-purple-700 bg-opacity-50 p-4 rounded-lg">
                            <div className="font-bold text-yellow-300 mb-2 text-lg">
                              {combo.cards?.join(' + ') || 'Unknown Combination'}
                            </div>
                            <div>{combo.purpose || 'No purpose specified'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.usageStats && (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-black bg-opacity-30 rounded-lg p-5">
                        <h3 className="text-xl font-bold mb-2">Estimated Popularity</h3>
                        <p className="text-2xl">{analysis.usageStats?.estimatedPopularity || 'Unknown'}</p>
                      </div>

                      <div className="bg-black bg-opacity-30 rounded-lg p-5">
                        <h3 className="text-xl font-bold mb-2">Meta Relevance</h3>
                        <p className="text-2xl">{analysis.usageStats?.metaRelevance || 'Unknown'}</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-900 bg-opacity-50 rounded-lg p-5">
                    <h3 className="text-xl font-bold mb-3">General Recommendations</h3>
                    <ul className="space-y-2">
                      {(analysis.recommendedChanges || []).map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-400 text-lg">→</span>
                          <span>{r}</span>
                        </li>
                      ))}
                      {(!analysis.recommendedChanges || analysis.recommendedChanges.length === 0) && (
                        <li className="text-gray-400 italic">No recommendations at this time</li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'replacements' && analysis && (analysis.cardReplacements || []).length > 0 && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold flex items-center gap-2">
                <Swords className="w-8 h-8" />
                Recommended Card Replacements
              </h2>
              <p className="text-gray-300">Click "Apply" to swap cards in your deck</p>

              <div className="space-y-4">
                {(analysis.cardReplacements || []).map((replacement, i) => {
                  const removeCardData = findCardByName(replacement?.removeCard);
                  const addCardData = findCardByName(replacement?.addCard);

                  return (
                    <div key={i} className="bg-gradient-to-r from-blue-900 to-purple-900 bg-opacity-50 rounded-lg p-5">
                      <div className="flex items-center gap-4 mb-4">
                        {removeCardData && (
                          <div className="flex-1">
                            <div className="text-sm text-gray-300 mb-2">Remove:</div>
                            <div className="bg-red-900 bg-opacity-50 rounded-lg p-3 flex items-center gap-3">
                              <img
                                src={removeCardData.imageUrl}
                                alt={removeCardData.name}
                                className="w-20 h-20 rounded-lg"
                              />
                              <div>
                                <div className="font-bold text-lg">{removeCardData.name}</div>
                                <div className="text-sm text-gray-300">{removeCardData.type} • {removeCardData.rarity}</div>
                                <div className="text-sm text-yellow-400">{removeCardData.elixir} Elixir</div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-center">
                          <ArrowRight className="w-8 h-8 text-yellow-400" />
                        </div>

                        {addCardData && (
                          <div className="flex-1">
                            <div className="text-sm text-gray-300 mb-2">Add:</div>
                            <div className="bg-green-900 bg-opacity-50 rounded-lg p-3 flex items-center gap-3">
                              <img
                                src={addCardData.imageUrl}
                                alt={addCardData.name}
                                className="w-20 h-20 rounded-lg"
                              />
                              <div>
                                <div className="font-bold text-lg">{addCardData.name}</div>
                                <div className="text-sm text-gray-300">{addCardData.type} • {addCardData.rarity}</div>
                                <div className="text-sm text-yellow-400">{addCardData.elixir} Elixir</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-black bg-opacity-30 rounded-lg p-4 mb-3">
                        <div className="text-sm text-gray-300 mb-1">Reason:</div>
                        <div className="text-white">{replacement.reason}</div>
                      </div>

                      <button
                        onClick={() => applyReplacement(replacement.removeCard, replacement.addCard)}
                        className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-5 h-5" />
                        Apply This Replacement
                      </button>
                    </div>
                  );
                })}
              </div>

              {analysis.cardReplacements.length === 0 && (
                <div className="text-center py-12 text-gray-300">
                  <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl">Your deck looks solid! No specific replacements needed.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClashRoyaleDeckBuilder;