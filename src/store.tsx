import { create, type StoreApi } from "zustand";
import type { Deck } from "@deck.gl/core";

export type State = {
  deckgl: Deck;
  setDeckgl: (instance: Deck) => void;
};

export type Store = StoreApi<State>;

export const useStore = create<State>()((set) => ({
  deckgl: undefined!,
  setDeckgl: (instance) => {
    set({ deckgl: instance });
  },
}));

export const selectors = {
  deckgl: (s) => s.deckgl,
  setDeckgl: (s) => s.setDeckgl,
} satisfies Record<string, (state: State) => State[keyof State]>;
