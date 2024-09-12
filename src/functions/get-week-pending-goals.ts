import dayjs from 'dayjs'
import { db } from '../db'
import { goalCompletions, goals } from '../db/schema'
import { and, count, eq, gte, lte, sql } from 'drizzle-orm'
import { number } from 'zod'

export async function getWeekPendingGoals() {
  const firstDayOfWeek = dayjs().startOf('week').toDate()
  const lastDayOfWeek = dayjs().endOf('week').toDate()
  // const currentWeek = dayjs().week()

  console.log(lastDayOfWeek.toISOString())

  const goalsCreatedUpToWeek = db.$with('goals_created_up_to_week').as(
    db
      .select({
        id: goals.id,
        title: goals.title,
        desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .where(lte(goals.createdAt, lastDayOfWeek))
  )

  // const goalsCompletedInWeek = db.$with('goals_completed_in_week').as(
  //   db
  //     .select({
  //       id: goals.id,
  //       title: goals.title,
  //       // mostrar fecha completa: con hora
  //       completedAt: goalCompletions.createdAt,
  //       completedAtDate: sql /*sql*/`
  //       -- quita las hora de la fecha
  //         DATE(${goalCompletions.createdAt})
  //       `.as('completedAtDate'),
  //     })
  //     .from(goalCompletions)
  //     .innerJoin(goals, eq(goals.id, goalCompletions.goalId))
  //     .where(
  //       and(
  //         gte(goalCompletions.createdAt, firstDayOfWeek),
  //         lte(goalCompletions.createdAt, lastDayOfWeek)
  //       )
  //     )
  // )

  const goalCompletionCounts = db.$with('goal_completion_counts').as(
    db
      .select({
        goalId: goalCompletions.goalId,
        completionCount: count(goalCompletions.id).as('completionCount'),
      })
      .from(goalCompletions)
      .where(
        and(
          gte(goalCompletions.createdAt, firstDayOfWeek),
          lte(goalCompletions.createdAt, lastDayOfWeek)
        )
      )
      .groupBy(goalCompletions.goalId)
  )

  const pendingGoals = await db
    .with(goalsCreatedUpToWeek, goalCompletionCounts)
    .select({
      id: goalsCreatedUpToWeek.id,
      title: goalsCreatedUpToWeek.title,
      desiredWeeklyFrequency: goalsCreatedUpToWeek.desiredWeeklyFrequency,
      completionCount: sql /*sql*/`
        COALESCE(${goalCompletionCounts.completionCount}, 0)
      `.mapWith(Number),
    })
    .from(goalsCreatedUpToWeek)
    .leftJoin(
      goalCompletionCounts,
      eq(goalCompletionCounts.goalId, goalsCreatedUpToWeek.id)
    )

  return { pendingGoals }
}
