Util = {}
window.Util = Util

class F
    constructor: (@factory) ->

f = (factory) ->
    return new F(factory)
Util.f = f

_get = (obj, name, defaultv) ->
    v = obj[name]
    if v is undefined
        if defaultv instanceof F
            return defaultv.factory()
        return defaultv
    return v

Util.bindnames = (obj, options, defaults) ->
    for name, v of defaults
        obj[name] = _get(options, name, v)



Util.removeFromArray = (a, item) ->
    match = -1
    while (match = a.indexOf(item)) > -1
        a.splice(match, 1)


Util.randomChoice = (array) ->
    return array[Math.floor Math.random() * array.length]



Util.minmax = (val, min, max) ->
    ###
    returns val if val is between min and max else, max/min
    ###

    if min < val < max
        return val

    if min > val
        return min

    if max < val
        return max

class Cycle

    constructor: (@_array) ->

    next: () ->
        item = @_array.shift()
        @_array.push item
        return item

Util.Cycle = Cycle

