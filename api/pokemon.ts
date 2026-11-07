import { useEffect, useState } from "react";

export interface PokemonApiResult {
  id: string;
  name: string;
  spriteUrl: string | null;
  speciesColorName?: string;
}

export async function fetchPokemonData(nameOrId: string): Promise<PokemonApiResult | null> {
  const query = nameOrId.toLowerCase().trim();
  if (!query) return null;

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error(`Pokemon not found: ${query}`);
  }

  const data = await res.json();
  const result: PokemonApiResult = {
    id: data.id.toString(),
    name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
    spriteUrl: data.sprites?.front_default || null,
  };

  // Fetch species color if available
  if (data.species && data.species.url) {
    try {
      const speciesRes = await fetch(data.species.url);
      if (speciesRes.ok) {
        const speciesData = await speciesRes.json();
        result.speciesColorName = speciesData.color?.name;
      }
    } catch {}
  }

  return result;
}

const pokemonCache = new Map<string, PokemonApiResult>();

export function usePokemonQuery(nameOrId: string, enabled: boolean = true) {
  const normalized = nameOrId.toLowerCase().trim();
  const cached = enabled && normalized ? pokemonCache.get(normalized) || null : null;
  const [fetchedData, setFetchedData] = useState<PokemonApiResult | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!enabled || !normalized || pokemonCache.has(normalized)) {
      return;
    }

    let active = true;
    fetchPokemonData(normalized)
      .then((res) => {
        if (!active) return;
        if (res) pokemonCache.set(normalized, res);
        setFetchedData(res);
        setIsError(false);
      })
      .catch(() => {
        if (!active) return;
        setIsError(true);
      });

    return () => {
      active = false;
    };
  }, [normalized, enabled]);

  const data = cached || (enabled && normalized ? fetchedData : null);
  return { data, isError };
}
