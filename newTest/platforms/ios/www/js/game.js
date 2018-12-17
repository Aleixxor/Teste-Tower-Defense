var config = {
    type: Phaser.AUTO,
    parent: 'content',
    width: 640,
    height: 512,
    physics: {
        default: 'arcade'
    },
    scene: {
        key: 'main',
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);

var path;
var turrets;
var enemies;

var ENEMY_SPEED = 1/10000;
var SHOT_SPEED = 500;
var BULLET_DAMAGE = 50;
var VISION_RADIUS = 200;

var fases = {
    fase1: {
        map:  [[ 0,-1, 0, 0, 0, 0, 0, 0, 0, 0],
                [ 0,-1, 0, 0, 0, 0, 0, 0, 0, 0],
                [ 0,-1,-1,-1,-1,-1,-1,-1, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0,-1, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0,-1, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0,-1, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0,-1, 0, 0],
                [ 0, 0, 0, 0, 0, 0, 0,-1, 0, 0]]
    },
    fase2: {
        map:  [[ 0, 0, 0,-1, 0, 0, 0, 0, 0, 0],
                [ 0, 0, 0,-1, 0, 0,-1,-1,-1, 0],
                [ 0, 0, 0,-1, 0, 0,-1, 0,-1, 0],
                [ 0, 0, 0,-1, 0, 0,-1, 0,-1, 0],
                [ 0, 0, 0,-1,-1,-1,-1, 0,-1, 0],
                [ 0, 0, 0, 0, 0, 0, 0, 0,-1, 0],
                [ 0, 0, 0, 0, 0, 0, 0, 0,-1, 0],
                [ 0, 0, 0, 0, 0, 0, 0, 0,-1, 0]]
    },
    fase3: {
        map:  [[ 0,-1,-1,-1, 0, 0, 0, 0, 0,-1],
                [ 0,-1, 0,-1, 0,-1,-1,-1, 0,-1],
                [ 0,-1, 0,-1, 0,-1, 0,-1, 0,-1],
                [ 0,-1, 0,-1, 0,-1, 0,-1, 0,-1],
                [ 0,-1, 0,-1, 0,-1, 0,-1, 0,-1],
                [ 0,-1, 0,-1, 0,-1, 0,-1, 0,-1],
                [ 0,-1, 0,-1,-1,-1, 0,-1, 0,-1],
                [ 0,-1, 0, 0, 0, 0, 0,-1,-1,-1]]
    },
    fase4: {
        map:  [[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
                [ 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
                [ 0,-1,-1,-1,-1,-1,-1,-1,-1,-1],
                [ 0,-1, 0, 0, 0, 0, 0, 0, 0, 0],
                [ 0,-1,-1,-1,-1,-1,-1,-1,-1, 0],
                [ 0, 0, 0, 0, 0, 0, 0, 0,-1, 0],
                [-1,-1,-1,-1,-1,-1,-1,-1,-1, 0],
                [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0]]
    }
}

function preload() {    
    this.load.atlas('sprites', 'assets/spritesheet.png', 'assets/spritesheet.json');
    this.load.image('bullet', 'assets/bullet.png');
}

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

var Enemy = new Phaser.Class({

        Extends: Phaser.GameObjects.Image,

        initialize:

        function Enemy (scene)
        {
            Phaser.GameObjects.Image.call(this, scene, 0, 0, 'sprites', 'enemy');
            this.speed = 1/randomIntFromInterval(5000,15000);
            this.follower = { t: 0, vec: new Phaser.Math.Vector2() };
            this.hp = 0;
        },

        startOnPath: function ()
        {
            this.follower.t = 0;
            this.hp = 100;
            
            path.getPoint(this.follower.t, this.follower.vec);
            
            this.setPosition(this.follower.vec.x, this.follower.vec.y);            
        },
        receiveDamage: function(damage) {
            this.hp -= damage;           
            
            // if hp drops below 0 we deactivate this enemy
            if(this.hp <= 0) {
                this.setActive(false);
                this.setVisible(false);      
            }
        },
        update: function (time, delta)
        {
            this.follower.t += this.speed * delta;
            path.getPoint(this.follower.t, this.follower.vec);
            
            this.setPosition(this.follower.vec.x, this.follower.vec.y);

            if (this.follower.t >= 1)
            {
                this.setActive(false);
                this.setVisible(false);
            }
        }

});

function getEnemy(x, y, distance) {
    var enemyUnits = enemies.getChildren();
    for(var i = 0; i < enemyUnits.length; i++) {       
        if(enemyUnits[i].active && Phaser.Math.Distance.Between(x, y, enemyUnits[i].x, enemyUnits[i].y) < distance)
            return enemyUnits[i];
    }
    return false;
} 

var Turret = new Phaser.Class({

        Extends: Phaser.GameObjects.Image,

        initialize:

        function Turret (scene)
        {
            Phaser.GameObjects.Image.call(this, scene, 0, 0, 'sprites', 'turret');
            this.nextTic = 0;
        },
        place: function(i, j) {            
            this.y = i * 64 + 64/2;
            this.x = j * 64 + 64/2;
            fases.fase4.map[i][j] = 1;            
        },
        fire: function() {
            var enemy = getEnemy(this.x, this.y, VISION_RADIUS);
            if(enemy) {
                var angle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
                addBullet(this.x, this.y, angle);
                this.angle = (angle + Math.PI/2) * Phaser.Math.RAD_TO_DEG;
            }
        },
        update: function (time, delta)
        {
            if(time > this.nextTic) {
                this.fire();
                this.nextTic = time + SHOT_SPEED;
            }
        }
});
    
var Bullet = new Phaser.Class({

        Extends: Phaser.GameObjects.Image,

        initialize:

        function Bullet (scene)
        {
            Phaser.GameObjects.Image.call(this, scene, 0, 0, 'bullet');

            this.incX = 0;
            this.incY = 0;
            this.lifespan = 0;

            this.speed = Phaser.Math.GetSpeed(600, 1);
        },

        fire: function (x, y, angle)
        {
            this.setActive(true);
            this.setVisible(true);
            //  Bullets fire from the middle of the screen to the given x/y
            this.setPosition(x, y);
            
        //  we don't need to rotate the bullets as they are round
        //    this.setRotation(angle);

            this.dx = Math.cos(angle);
            this.dy = Math.sin(angle);

            this.lifespan = 1000;
        },

        update: function (time, delta)
        {
            this.lifespan -= delta;

            this.x += this.dx * (this.speed * delta);
            this.y += this.dy * (this.speed * delta);

            if (this.lifespan <= 0)
            {
                this.setActive(false);
                this.setVisible(false);
            }
        }

    });
var graphics;
function create() {
    graphics = this.add.graphics();
    drawLines(graphics);
    // map =  [[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
    //         [ 0, 0, 0, 0, 0, 0, 0, 0, 0,-1],
    //         [ 0,-1,-1,-1,-1,-1,-1,-1,-1,-1],
    //         [ 0,-1, 0, 0, 0, 0, 0, 0, 0, 0],
    //         [-1,-1,-1,-1,-1,-1,-1,-1,-1, 0],
    //         [-1,-1, 0, 0, 0, 0, 0, 0,-1, 0],
    //         [-1,-1,-1,-1,-1,-1,-1,-1,-1, 0],
    //         [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0]];

    path = this.add.path(32, -32);
    
    drawMap(fases.fase4.map);
    
    
    graphics.lineStyle(2, 0xffffff, 1);
    path.draw(graphics);
    
    enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: true });
    
    turrets = this.add.group({ classType: Turret, runChildUpdate: true });
    
    bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    
    this.nextEnemy = 0;
    
    this.physics.add.overlap(enemies, bullets, damageEnemy);
    
    this.input.on('pointerdown', placeTurret);
}

function drawMap(map){
    let printed = "";
    let biggerC = 0;
    let lesserC = 0;
    let column = -1;
    for(let l=0; l<map.length;l++){
        column = -1;
        let alreadyChecked = false;
        

        do{
            column = column + 1;
            
            if (alreadyChecked == false){
               console.log("alreadyChecked == false")
               if(map[l][column] == -1){
                   console.log("LESSERC == "+column)
                   lesserC = column;
                   alreadyChecked = true;
               }
            }
            console.log("column: %s\nmap.length: %s\nalreadychecked: %s\nlesserC: %s",column, map.length, alreadyChecked, lesserC)
       }while(column < map[l].length);
       
        alreadyChecked = false;
        console.log("--------------------\nbiggerC: %s\nlesserC: %s", biggerC, lesserC);
        if(biggerC == lesserC){
            for(let c=0; c<map[l].length;c++){
                if(map[l][c] == -1){
                    path.lineTo(32+(32*c*2), 32+(32*l*2));
                    biggerC = c;
                    console.log("l: "+(32+(32*l*2))+", c: "+(32+(32*c*2)));
                }
                printed += map[l][c]+" ";
            }

        }else{

            for(let c=map[l].length-1; c>0;c--){
                if(map[l][c] == -1){
                    path.lineTo(32+(32*c*2), 32+(32*l*2));
                    biggerC = c;
                    console.log("l: "+(32+(32*l*2))+", c: "+(32+(32*c*2)));
                }
                printed += map[l][c]+" ";
            }

        }
        
        printed += "\n";
        console.log(printed);
    }
}

function damageEnemy(enemy, bullet) {  
    // only if both enemy and bullet are alive
    if (enemy.active === true && bullet.active === true) {
        // we remove the bullet right away
        bullet.setActive(false);
        bullet.setVisible(false);    
        
        // decrease the enemy hp with BULLET_DAMAGE
        enemy.receiveDamage(BULLET_DAMAGE);
    }
}

function drawLines(graphics) {
    graphics.lineStyle(1, 0x0000ff, 0.8);
    for(var i = 0; i < 8; i++) {
        graphics.moveTo(0, i * 64);
        graphics.lineTo(640, i * 64);
    }
    for(var j = 0; j < 10; j++) {
        graphics.moveTo(j * 64, 0);
        graphics.lineTo(j * 64, 512);
    }
    graphics.strokePath();
}

function update(time, delta) {  

    if (time > this.nextEnemy)
    {
        var enemy = enemies.get();
        if (enemy)
        {
            enemy.setActive(true);
            enemy.setVisible(true);
            enemy.startOnPath();

            this.nextEnemy = time + 2000;
        }       
    }
}

function canPlaceTurret(i, j) {
    return fases.fase4.map[i][j] === 0;
}

function placeTurret(pointer) {
    var i = Math.floor(pointer.y/64);
    var j = Math.floor(pointer.x/64);
    if(canPlaceTurret(i, j)) {
        var turret = turrets.get();
        if (turret)
        {
            turret.setActive(true);
            turret.setVisible(true);
            turret.place(i, j);
        }   
    }
}

function addBullet(x, y, angle) {
    var bullet = bullets.get();
    if (bullet)
    {
        bullet.fire(x, y, angle);
    }
}