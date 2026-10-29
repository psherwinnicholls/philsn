package uk.co.philsn.goldenangle.core

/** Short-lived flourishes triggered by game events, aged by the caller's clock. */
class Effects {
    enum class Kind { GOLDEN, PLANT, BRUISE, BLOOM, NEAR_MISS }

    data class Fx(val kind: Kind, val angle: Double, val value: Int, var age: Double = 0.0) {
        val lifetime: Double
            get() = when (kind) {
                Kind.GOLDEN -> 0.7
                Kind.PLANT -> 0.22
                Kind.BRUISE -> 0.6
                Kind.BLOOM -> 1.4
                Kind.NEAR_MISS -> 0.6
            }
        val progress: Double get() = (age / lifetime).coerceIn(0.0, 1.0)
    }

    private val _active = ArrayList<Fx>()
    val active: List<Fx> get() = _active

    fun onEvents(events: List<GameEvent>) {
        for (e in events) when (e) {
            is GameEvent.Planted -> {
                _active += Fx(Kind.PLANT, e.angle, 0)
                if (e.golden) _active += Fx(Kind.GOLDEN, e.angle, e.multiplier)
                if (e.nearMiss) _active += Fx(Kind.NEAR_MISS, e.angle, if (e.golden) 1 else 0)
            }
            is GameEvent.Bruised -> _active += Fx(Kind.BRUISE, e.angle, e.petalsLeft)
            is GameEvent.Bloomed -> _active += Fx(Kind.BLOOM, 0.0, e.bloom)
            is GameEvent.Over, GameEvent.EnteredGold -> {}
        }
    }

    fun update(dt: Double) {
        _active.forEach { it.age += dt }
        _active.removeAll { it.age >= it.lifetime }
    }

    fun clear() = _active.clear()
}
