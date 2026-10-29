package uk.co.philsn.goldenangle.core

import kotlin.test.Test
import kotlin.test.assertEquals

class AnglesTest {
    @Test
    fun goldenAngleIsAbout137Point5() {
        assertEquals(137.5078, Angles.GOLDEN, 1e-4)
    }

    @Test
    fun normWrapsIntoZeroTo360() {
        assertEquals(10.0, Angles.norm(370.0), 1e-9)
        assertEquals(350.0, Angles.norm(-10.0), 1e-9)
        assertEquals(0.0, Angles.norm(720.0), 1e-9)
    }

    @Test
    fun distIsShortestWayRound() {
        assertEquals(20.0, Angles.dist(350.0, 10.0), 1e-9)
        assertEquals(180.0, Angles.dist(0.0, 180.0), 1e-9)
        assertEquals(0.0, Angles.dist(-360.0, 0.0), 1e-9)
    }

    @Test
    fun deltaIsSigned() {
        assertEquals(20.0, Angles.delta(350.0, 10.0), 1e-9)
        assertEquals(-20.0, Angles.delta(10.0, 350.0), 1e-9)
    }

    @Test
    fun goldenClearanceMatchesFibonacciSpacing() {
        // The closest earlier seed is always a Fibonacci number of steps back.
        assertEquals(137.51, Angles.goldenClearance(1), 0.01)
        assertEquals(84.98, Angles.goldenClearance(2), 0.01)
        assertEquals(52.52, Angles.goldenClearance(3), 0.01)
        assertEquals(32.46, Angles.goldenClearance(5), 0.01)
        assertEquals(20.06, Angles.goldenClearance(8), 0.01)
        assertEquals(Angles.goldenClearance(5), Angles.goldenClearance(7), 1e-9)
    }

    @Test
    fun multiplierFollowsFibonacciAndCaps() {
        val seq = (0..9).map { fibonacciMultiplier(it, 21) }
        assertEquals(listOf(1, 2, 3, 5, 8, 13, 21, 21, 21, 21), seq)
    }
}
