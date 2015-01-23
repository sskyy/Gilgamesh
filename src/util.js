var util = {

  isArray : function( obj ){
    return Object.prototype.toString.call(obj) === "[object Array]"
  },
  isFunction : function(obj){
    return Object.prototype.toString.call(obj) === "[object Function]"
  },
  isObject : function( obj ){
    return typeof obj == "object"
  },
  isPlainObject : function(){
    return Object.prototype.toString.call(obj) === "[object Object]"
  },
  isNaiveObject : function(obj){
    return (typeof obj == "object")&& !util.isArray(obj)
  } ,
  isUndefined : function( obj ){
    return obj === undefined
  },
  inArray : function( i, arr ){
    return arr.indexOf(i) !== -1
  },
  forEach : function( arr, cb ){
    return arr.forEach(cb)
  },
  defaults : function( target, defaults, deep){
    for( var i in defaults ){
      if( target[i] === undefined ){
        target[i] = defaults[i]
      }else if( deep && util.isNaiveObject(target) && util.isNaiveObject(defaults) ){
        util.defaults( target[i], defaults[i] )
      }
    }
    return target
  },
  difference : function( target, toDiff){
    return target.filter(function(v){
      return !util.inArray( v, toDiff)
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
  merge : function( target, source, mergeArray ){
    for( var i in source ){
      if( util.isNaiveObject(target[i]) && util.isNaiveObject(source[i])){
        util.merge( target[i], source[i])
      }else if( mergeArray && util.isArray(target[i]) && util.isArray(source[i])){
        target[i] = target[i].concat( source[i])
      }else{
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
    util.forOwn(source, function(v,k){
      var r
      if( handler ) r = handler(v,k )
      o[k] = (r ===undefined) ? v : r
    })
    return o
  },
  cloneDeep:function( source, handler ){
    return util.isObject(source) ?  util.clone( source, function( v, k){
      var r
      if( handler ) r = handler(v,k )
      return (r ===undefined) ? util.cloneDeep(v, handler) : r
    }) : source
  },
  partialRight : function(fn){
    var partialArgs = Array.prototype.slice.call( arguments, 1 )
    return function(){
      var args = Array.prototype.slice.call( arguments).concat( partialArgs )
      return fn.apply( fn, args)
    }
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
  },
  result : function( fn ){
    if( util.isFunction(fn) ){
      return fn.apply( fn, Array.prototype.slice.call(arguments,1) )
    }else{
      return fn
    }
  }

}

module.exports = util