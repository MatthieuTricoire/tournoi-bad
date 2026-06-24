import { createServerFn } from "@tanstack/react-start";
import { db } from "#/db";
import {
  players,
  matches,
  matchParticipants,
  tournamentSettings,
} from "#/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateRound } from "#/lib/utils";

export const startNextRound = createServerFn({ method: "POST" }).handler(
  async () => {
    return db.transaction((tx) => {
      // 1. Lire la configuration globale du tournoi
      const settings = tx
        .select()
        .from(tournamentSettings)
        .where(eq(tournamentSettings.id, 1))
        .get();

      const maxCourts = settings ? settings.availableCourts : 4;
      const isParityActive = settings ? settings.maximizeParity : false;
      const roundType = settings ? settings.roundType : "infinite";
      const maxRounds = settings ? (settings.maxRounds ?? 0) : 0;

      // SÉCURITÉ A : Si le tournoi est déjà marqué comme terminé
      if (settings && settings.status === "finished") {
        throw new Error(
          "Le tournoi est terminé ! Impossible de générer un nouveau round.",
        );
      }

      // 2. Trouver le numéro du prochain round
      const lastMatch = tx
        .select({ roundNumber: matches.roundNumber })
        .from(matches)
        .orderBy(desc(matches.roundNumber))
        .get();

      const nextRoundNumber = lastMatch ? lastMatch.roundNumber + 1 : 1;

      // SÉCURITÉ B : Si on est en mode "Fixe" et qu'on dépasse la limite configurée
      if (roundType === "fixed" && nextRoundNumber > maxRounds) {
        // On bascule automatiquement le tournoi sur "finished"
        tx.update(tournamentSettings)
          .set({ status: "finished" })
          .where(eq(tournamentSettings.id, 1))
          .run();
        return { success: true, finished: true };
      }

      // 3. Récupérer tous les joueurs marqués "présents"
      const allPlayers = tx
        .select({
          id: players.id,
          firstname: players.firstname,
          lastname: players.lastname,
          gender: players.gender, // Récupéré pour la parité
          playedGames: players.playedGames,
        })
        .from(players)
        .where(eq(players.present, true))
        .all();

      // 4. Récupérer l'historique complet pour éviter les répétitions
      const globalHistory = tx
        .select({
          matchId: matchParticipants.matchId,
          playerId: matchParticipants.playerId,
          team: matchParticipants.team,
        })
        .from(matchParticipants)
        .all();

      // 5. Générer le round via l'algorithme (avec l'option de parité !)
      const { matches: newMatches } = generateRound(
        allPlayers,
        globalHistory,
        maxCourts,
        nextRoundNumber,
        isParityActive, // Passé à l'algo
      );

      // 6. Insérer les nouveaux matchs et participants en DB
      for (const matchData of newMatches) {
        const insertedMatch = tx
          .insert(matches)
          .values({
            roundNumber: matchData.roundNumber,
            court: matchData.court,
            status: "waiting",
          })
          .returning({ id: matches.id })
          .get();

        const participantsValues = [
          ...matchData.team1Ids.map((pId) => ({
            matchId: insertedMatch.id,
            playerId: pId,
            team: 1,
          })),
          ...matchData.team2Ids.map((pId) => ({
            matchId: insertedMatch.id,
            playerId: pId,
            team: 2,
          })),
        ];
        tx.insert(matchParticipants).values(participantsValues).run();

        // Incrémenter le nombre de matchs joués (+1) pour les joueurs actifs
        const activePlayerIds = [...matchData.team1Ids, ...matchData.team2Ids];
        for (const pId of activePlayerIds) {
          const player = tx
            .select({ playedGames: players.playedGames })
            .from(players)
            .where(eq(players.id, pId))
            .get();
          const currentGames = player ? player.playedGames : 0;

          tx.update(players)
            .set({ playedGames: currentGames + 1 })
            .where(eq(players.id, pId))
            .run();
        }
      }

      // 7. Mettre à jour le round actuel dans la configuration globale
      tx.update(tournamentSettings)
        .set({ currentRound: nextRoundNumber })
        .where(eq(tournamentSettings.id, 1))
        .run();

      return { success: true, round: nextRoundNumber, finished: false };
    });
  },
);
