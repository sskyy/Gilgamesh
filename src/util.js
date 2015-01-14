var util = {
  forEach : function( arr, cb ){
    return arr.forEach(cb)
  },
  defaults : function( target, defaults){
    for( var i in defaults ){
      if( target[i] === undefined ) target[i] = defaults[i]
    }
    return target
  },
  isArray : function( obj ){
    return Object.prototype.toString.call(obj) === "[object Array]"
  },
  isFunction : function(obj){
    return Object.prototype.toString.call(obj) === "[object Function]"
  },
  isObject : function( obj ){
    return typeof obj == "object"
  },
  isUndefined : function( obj ){
    return obj === undefined
  },
  inArray : function( i, arr ){
    return arr.indexOf(i) !== -1
  },
  difference : function( target, toDiff){
    var root = this
    return target.filter(function(v){
      return !root.inArray( v, toDiff)
    })
  },
  pluck : function( arr, attr){
    return arr.map(function(v){return v[attr]}).filter(function(v){return v!==undefined})
  },
  extend:function( target, source){
    for( var i in source ){
      if( source.hasOwnProperty(i) ){
        target[i] = source[i]
      }
    }
    return target
  },
  forOwn : function( obj, cb ){
    for( var i in obj ){
      if( obj.hasOwnProperty(i) ){
        cb( obj[i], i )
      }
    }
  },
  clone : function(source, handler){
    var o = util.isArray(source ) ? [] : {}
    this.forOwn(source, function(v,k){
      var r
      if( handler ) r = handler(v,k )
      o[k] = (r ===undefined) ? v : r
    })
    return o
  },
  cloneDeep:function( source, handler ){
    var root = this
    return root.isObject(source) ?  this.clone( source, function( v, k){
      var r
      if( handler ) r = handler(v,k )
      return (r ===undefined) ? root.cloneDeep(v, handler) : r
    }) : source
  },
  toArray:function( arrLike){
    return Array.prototype.slice.call(arrLike)
  },
  zipObject : function(keys, values){

    var o = {}
    keys.forEach(function(key, i){
      o[key] = values[i]
    })
    return o
  }
}

module.exports = util