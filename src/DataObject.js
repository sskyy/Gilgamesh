var _ = require("lodash")

function DataObject(){
  this.setupObservers()
}

DataObject.prototype.set =function(obj){
  _.extend( this, obj)
  this.$$keys = Object.keys(obj)
  this.$$filled = true
}


DataObject.prototype.setupObservers = function(){
  var root = this
  _.forEach(["$$valid", "$$empty", "$$validating", "$$saving" , "$$saved"], function(key){
    root[key] = null
  })

  _.forEach(["$$dirty","$$filled"],function(key){
    root[key] = false
  })

  root.$$watchers = {}

  Object.observe && Object.observe(this, function(changes){
    changes && changes.forEach(root.dispatchChanges.bind(root))
  })
}

//change : {name, obj, type, oldValue}
DataObject.prototype.dispatchChanges = function( change ){
  console.log("changing", change.name, this.$$watchers[change.name].length)
  if( this.$$watchers[change.name] ){
    this.$$watchers[change.name].forEach(function( handler ){
      try{
        handler(change.object[change.name], change.oldValue)
      }catch(e){
        console.log(e)
      }
    })
  }
}

DataObject.prototype.watch = function( name, handler ){
  this.$$watchers[name] ?  this.$$watchers[name].push(handler) : (this.$$watchers[name] = [handler])
}


//need to be implemented
DataObject.prototype.validate = function(){
}
//need to be implemented
DataObject.prototype.save = function(){
}
//need to be implemented
DataObject.prototype.delete = function(){
}

DataObject.prototype.notify = function(){
  //dirty implement
  var root = this
  _.forEach(this.$$watchers, function( watchers, key ){
    watchers.forEach(function( handler ){
      handler( root[key] )
    })
  })
}

module.exports = DataObject