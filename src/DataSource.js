var   global = this


function DataObject( proto ){
  this.$$keys = Object.keys(proto)
  _.extend( this, proto )
  this.setupObservers()
}


DataObject.prototype.setupObservers = function(){
  var root = this
  _.forEach(["$$valid", "$$empty", "$$validating", "$$saving" , "$$saved"], function(key){
    root[key] = null
  })

  _.forEach(["$$dirty"],function(key){
    root[key] = false
  })

  root.$$watchers = {}

  Object.observe(this, function(changes){
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

DataObject.prototype.validate = function(){

}

DataObject.prototype.save = function(){
  this.$$saving = true
  var root = this
  window.setTimeout(function(){
    root.$$saved = true
    root.$$saving= false
  },1000)
}



var dataSources = {}

global.data = function( source, id ){
  if( !dataSources[source] ) dataSources[source] = {}
  dataSources[source][id] = new DataObject({
    "id" : "123123",
    "name" : "Gilgamesh",
    "gender" : "male"
  })

  return dataSources[source][id]
}

global.data.get = function( source, id ){
  return dataSources[source][id]
}






