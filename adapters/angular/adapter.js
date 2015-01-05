(function(){

  var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
  var FN_ARG_SPLIT = /,/;
  var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
  var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

  function annotate (fn) {
    var $inject = [];
    fn = fn.toString();
    var first = fn.replace(STRIP_COMMENTS, '');
    var second = first.match(FN_ARGS)[1];
    var third = second.split(FN_ARG_SPLIT);
    third.forEach(function (arg) {
      arg.replace(FN_ARG, function (all, underscore, name) {
        $inject.push(name);
      });
    });
    return $inject;
  }



  var _module = angular.module
  angular.module = function(){
    var module = _module.apply( angular, arguments)

    module.gmDirective = function(name, directiveDef){
      var directiveDefArgs = annotate( directiveDef )


      function replaceEmptyInnerHTML( $target, $source ){
        if( isEmptyInnerHTML($target) ){
          $target.innerHTML =  $source.innerHTML
        }
      }

      function replaceSourceInnerHTML( $target, $source ){
        if( !isEmptyInnerHTML($source) ){
          $target.innerHTML =  $source.innerHTML
        }
      }

      function isEmptyInnerHTML( el ){
        return /^\s*$/.test( el.innerHTML)
      }

      function replaceWith(  toReplace, target){
        var parent = target.parentNode
        parent.replaceChild( toReplace, target)
      }

      function removeElement( el ){
        el.parentNode.removeChild(el)
      }

      function replaceInnerHTML( toReplace, target){
        target.innerHTML = toReplace.innerHTML
      }

      var replacedDirectiveDef = function(){
        var directive =  directiveDef.apply( directiveDef, arguments)

        if( directive.compile ) throw new Error("you cannot wrap a directive with compile")
        if( directive.transclude ) throw new Error("you cannot wrap a directive with transclude")

        if( !directive.scope ) directive.scope = true

        var cacheId = -1
        var originElementCache = {}
        var cacheAttribute = "gm-child-cache-id"

        //TODO add tag name support
        angular.forEach( document.querySelectorAll("["+name.replace(/([A-Z])/g,"-$1").toLowerCase()+"]"), function( el ){
          if( el.getAttribute(cacheAttribute) !== null ) return
          ++cacheId
          originElementCache[cacheId] = el.cloneNode(true)
          el.setAttribute(cacheAttribute,cacheId)
        })

        directive.compile = function( $el ){

          var compilingImportEls = []

          //should only compile once and only compile with the one that has template
          if( (directive.template || directive.templateUrl) && $el[0].getAttribute("gm-compiled") === null ) {

            var originEl = originElementCache[$el[0].getAttribute(cacheAttribute)]
            var compileElClone = $el[0].cloneNode(true)
            var totalOverwrite = !isEmptyInnerHTML(originEl)

            //only include particular child element
            if( originEl.getAttribute("gm-tpl-include") !== null ){
              totalOverwrite = false
              angular.forEach( originEl.childNodes, function( childEl ){
                if( !childEl.getAttribute ) return
                var roleEl = $el[0].querySelector("[gm-role="+ childEl.getAttribute("gm-role")+"]")
                if( roleEl ){
                  replaceEmptyInnerHTML(childEl,roleEl )
                }
                $el[0].innerHTML = originEl.innerHTML
              })
            }

            //only overwrite particular element
            if( originEl.getAttribute('gm-tpl-partial') !==null ){
              totalOverwrite = false
              angular.forEach(originEl.childNodes,function(roleEl){
                //exclude text, comment and other node type
                if( !roleEl.getAttribute ) return
                var role = roleEl.getAttribute("gm-role")

                angular.forEach($el[0].querySelectorAll("[gm-role="+role+"]"),function( targetEl){
                  replaceEmptyInnerHTML( roleEl, targetEl)
                  replaceWith( roleEl, targetEl)
                })
              })
            }

            if( originEl.getAttribute('gm-tpl-exclude') !==null ){
              totalOverwrite = false
              $el[0].getAttribute('gm-tpl-exclude').split(",").forEach(function( roleToExclude){
                removeElement($el[0].querySelector("[gm-role="+roleToExclude+"]"))
              })
            }

            if( totalOverwrite ){
              $el[0].innerHTML = originEl.innerHTML
            }

            //handle import with gm-tpl-inject   and handle import with gm-role
            var id = originEl.getAttribute("id")
            angular.forEach(document.querySelectorAll("[gm-import="+id+"]"),function(importEl){
              var tobeCompiledCloneEl
              var roleEl

              if( importEl.getAttribute("gm-role")!==null ){
                roleEl = compileElClone.querySelector("[gm-role="+ importEl.getAttribute("gm-role")+"]")
                if( roleEl ){
                  tobeCompiledCloneEl = roleEl.cloneNode(true)
                  replaceSourceInnerHTML(tobeCompiledCloneEl, roleEl)
                  tobeCompiledCloneEl.setAttribute("gm-import",id)
                }else{
                  console.log("no such role", importEl.getAttribute("gm-role"),"in element", $el[0])
                }

              }else{
                tobeCompiledCloneEl = importEl.cloneNode(true)
              }
              console.log( tobeCompiledCloneEl)

              $el[0].appendChild( tobeCompiledCloneEl )
              compilingImportEls.push([ importEl, tobeCompiledCloneEl ])
            })



            $el[0].getAttribute("gm-compiled",true)
          }

          return function( scope, ele, attrs){
              window.setTimeout(function(){
                var resetEl
                while( resetEl = compilingImportEls.pop() ){
                  replaceWith( resetEl[1],resetEl[0] )
                }
              },1)

            return directive.link.call(directive, scope, ele, attrs)
          }

        }
        return directive
      }

      replacedDirectiveDef.$inject = directiveDefArgs

      return module.directive( name, replacedDirectiveDef)
    }

    return module
  }

})()







