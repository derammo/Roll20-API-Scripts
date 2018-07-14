/*
 * Version 0.2.6
 *
 * Made By Robin Kuiper
 * Skype: RobinKuiper.eu
 * Discord: Atheos#1095
 * Roll20: https://app.roll20.net/users/1226016/robin
 * Roll20 Thread: https://app.roll20.net/forum/post/6248700/script-beta-beyondimporter-import-dndbeyond-character-sheets
 * Github: https://github.com/RobinKuiper/Roll20APIScripts
 * Reddit: https://www.reddit.com/user/robinkuiper/
 * Patreon: https://patreon.com/robinkuiper
 * Paypal.me: https://www.paypal.me/robinkuiper
 *
 * Modified By Matt DeKok
 * Discord: Sillvva#2532
 * Roll20: https://app.roll20.net/users/494585/sillvva
 * Github: https://github.com/sillvva/Roll20-API-Scripts
 */

(function() {
    const _ABILITIES = {1:'STR',2:'DEX',3:'CON',4:'INT',5:'WIS',6:'CHA'};
    const _ABILITY = {'STR': 'strength', 'DEX': 'dexterity', 'CON': 'constitution', 'INT': 'intelligence', 'WIS': 'wisdom', 'CHA': 'charisma'}
    const _ABILITYCAP = {'STR': 'Strength', 'DEX': 'Dexterity', 'CON': 'Constitution', 'INT': 'Intelligence', 'WIS': 'Wisdom', 'CHA': 'Charisma'}

    const skills = ['acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight_of_hand', 'stealth', 'survival']

    var class_spells = [];
    var object;

    // Styling for the chat responses.
    const style = "overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;";
    const buttonStyle = "background-color: #000; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; float: right;"

    var jack = '0';

    const script_name = 'BeyondImporter';
    const state_name = 'BEYONDIMPORTER';

    on('ready', function() {
        checkInstall();
        log(script_name + ' Ready! Command: !'+state[state_name].config.command);
        if(state[state_name].config.debug){ sendChat('', script_name + ' Ready!', null, {noarchive:true}); }
    });

    on('chat:message', function(msg) {
        if (msg.type != 'api') return;

        // Split the message into command and argument(s)
        var args = msg.content.split(' ');
        var command = args.shift().substring(1);
        var extracommand = args.shift();

        if (command == 'beyond') {
            switch(extracommand){
                case 'help':
                    sendHelpMenu();
                    break;

                case 'reset':
                    state[state_name] = {};
                    setDefaults(true);
                    sendConfigMenu();
                    break;

                case 'config':
                    if(args.length > 0){
                        var setting = args.shift().split('|');
                        var key = setting.shift();
                        var value = (setting[0] === 'true') ? true : (setting[0] === 'false') ? false : setting[0];

                        if(key === 'prefix' && value.charAt(0) !== '_'){ value = '_' + value}

                        state[state_name].config[key] = value;
                    }

                    sendConfigMenu();
                    break;

                case 'imports':
                    if(args.length > 0){
                        var setting = args.shift().split('|');
                        var key = setting.shift();
                        var value = (setting[0] === 'true') ? true : (setting[0] === 'false') ? false : setting[0];

                        state[state_name].config.imports[key] = value;
                    }

                    sendConfigMenu();
                    break;

                case 'import':
                    var json = msg.content.substring(14);
                    var character = JSON.parse(json).character;

                    class_spells = [];

                    // Remove characters with the same name if overwrite is enabled.
                    if(state[state_name].config.overwrite){
                        var objects = findObjs({
                            _type: "character",
                            name: character.name + state[state_name].config.prefix
                        }, {caseInsensitive: true});

                        for(var i = 0; i < objects.length; i++){
                            objects[i].remove();
                        }
                    }

                    // Create character object
                    object = createObj("character", { name: character.name + state[state_name].config.prefix });

                    // Make Speed String
                    var weightSpeeds = character.race.weightSpeeds;

                    var speedMods = getObjects(character, 'subType', 'speed');
                    if(speedMods != null) {
                        speedMods.forEach(function(speedMod) {
                            if(speedMod.type == 'set') {
                                weightSpeeds.normal.walk = (speedMod.value > weightSpeeds.normal.walk ? speedMod.value : weightSpeeds.normal.walk);
                            }
                        });
                    }

                    speedMods = getObjects(character, 'subType', 'innate-speed-flying');
                    if(speedMods != null) {
                        speedMods.forEach(function(speedMod) {
                            if(speedMod.type == 'set' && speedMod.id.indexOf('spell') == -1) {
                                if(speedMod.value == null) speedMod.value = weightSpeeds.normal.walk;
                                weightSpeeds.normal.fly = (speedMod.value > weightSpeeds.normal.fly ? speedMod.value : weightSpeeds.normal.fly);
                            }
                        });
                    }

                    speedMods = getObjects(character, 'subType', 'innate-speed-swimming');
                    if(speedMods != null) {
                        speedMods.forEach(function(speedMod) {
                            if(speedMod.type == 'set' && speedMod.id.indexOf('spell') == -1) {
                                if(speedMod.value == null) speedMod.value = weightSpeeds.normal.walk;
                                weightSpeeds.normal.swim = (speedMod.value > weightSpeeds.normal.swim ? speedMod.value : weightSpeeds.normal.swim);
                            }
                        });
                    }

                    speedMods = getObjects(character, 'subType', 'innate-speed-climbing');
                    if(speedMods != null) {
                        speedMods.forEach(function(speedMod) {
                            if(speedMod.type == 'set' && speedMod.id.indexOf('spell') == -1) {
                                if(speedMod.value == null) speedMod.value = weightSpeeds.normal.walk;
                                weightSpeeds.normal.climb = (speedMod.value > weightSpeeds.normal.climb ? speedMod.value : weightSpeeds.normal.climb);
                            }
                        });
                    }

                    speedMods = getObjects(character, 'subType', 'unarmored-movement');
                    if(speedMods != null) {
                        speedMods.forEach(function(speedMod) {
                            if(speedMod.type == 'bonus') {
                                weightSpeeds.normal.walk += speedMod.value;
                                if(weightSpeeds.normal.fly > 0) weightSpeeds.normal.fly += speedMod.value;
                                if(weightSpeeds.normal.swim > 0) weightSpeeds.normal.swim += speedMod.value;
                                if(weightSpeeds.normal.climb > 0) weightSpeeds.normal.climb += speedMod.value;
                            }
                        });
                    }

                    speedMods = getObjects(character, 'subType', 'speed');
                    if(speedMods != null) {
                        speedMods.forEach(function(speedMod) {
                            if(speedMod.type == 'bonus') {
                                weightSpeeds.normal.walk += speedMod.value;
                                if(weightSpeeds.normal.fly > 0) weightSpeeds.normal.fly += speedMod.value;
                                if(weightSpeeds.normal.swim > 0) weightSpeeds.normal.swim += speedMod.value;
                                if(weightSpeeds.normal.climb > 0) weightSpeeds.normal.climb += speedMod.value;
                            }
                        });
                    }

                    var speed = weightSpeeds.normal.walk + 'ft.';
                    for(var key in weightSpeeds.normal){
                        if(key !== 'walk' && weightSpeeds.normal[key] !== 0){
                            speed += ', ' + key + ' ' + weightSpeeds.normal[key] + 'ft.';
                        }
                    }

                    // Import Character Inventory
                    var hasArmor = false;
                    if(state[state_name].config.imports.inventory){
                        const inventory = character.inventory;
                        if(inventory != null) inventory.forEach(function(item) {
                            var row = generateRowID();

                            var attributes = {};
                            attributes["repeating_inventory_"+row+"_itemname"] = item.definition.name;
                            attributes["repeating_inventory_"+row+"_equipped"] = (item.equipped) ? '1' : '0';
                            attributes["repeating_inventory_"+row+"_itemcount"] = item.quantity;
                            attributes["repeating_inventory_"+row+"_itemweight"] = item.definition.weight / item.definition.bundleSize;
                            attributes["repeating_inventory_"+row+"_itemcontent"] = replaceChars(item.definition.description);
                            var _itemmodifiers = 'Item Type: ' + item.definition.type;
                            item.definition.grantedModifiers.forEach(function(grantedMod) {
                                for(var abilityId in _ABILITIES) {
                                    var ABL = _ABILITIES[abilityId];
                                    if(grantedMod.type == 'set' && grantedMod.subType == _ABILITY[ABL]+'-score') {
                                        _itemmodifiers += ', '+_ABILITYCAP[ABL]+': '+grantedMod.value;
                                    }
                                }
                                if(grantedMod.type == 'bonus' && (grantedMod.subType == 'unarmored-armor-class' || grantedMod.subType == 'armor-class')) {
                                    if(grantedMod.subType == 'armor-class') {
                                        hasArmor = true;
                                    }
                                    if(item.definition.hasOwnProperty('armorClass')) {
                                        item.definition.armorClass += grantedMod.value;
                                    }
                                    else {
                                        _itemmodifiers += ', AC +' + grantedMod.value;
                                    }
                                }
                                if(grantedMod.type == 'bonus' && (grantedMod.subType == 'saving-throws')) {
                                    _itemmodifiers += ', Saving Throws +' + grantedMod.value;
                                }
                            });
                            if(item.definition.hasOwnProperty('armorClass')){
                                _itemmodifiers += ', AC: ' + item.definition.armorClass;
                                hasArmor = true;
                            }
                            if(typeof item.definition.damage === 'object' && item.definition.type !== 'Ammunition'){
                                var properties = '';
                                var finesse = false;
                                for(var j = 0; j < item.definition.properties.length; j++){
                                    properties += item.definition.properties[j].name + ', ';

                                    //if(item.definition.properties[j].name === 'Finesse'){ finesse = true }
                                }
                                attributes["repeating_inventory_"+row+"_itemproperties"] = properties;
                                attributes["repeating_inventory_"+row+"_hasattack"] = '0';
                                _itemmodifiers = 'Item Type: ' + item.definition.attackType + ' ' + item.definition.filterType + ', Damage: ' + item.definition.damage.diceString + ', Damage Type: ' + item.definition.damageType + ', Range: ' + item.definition.range + '/' + item.definition.longRange;

                                var magic = 0;
                                item.definition.grantedModifiers.forEach(function(grantedMod) {
                                    if(grantedMod.type == 'bonus' && grantedMod.subType == 'magic') {
                                        magic += grantedMod.value;
                                    }
                                });

                                // CREATE ATTACK
                                var attack = {
                                    name: item.definition.name,
                                    range: item.definition.range + '/' + item.definition.longRange,
                                    attack: {
                                        attribute: _ABILITY[_ABILITIES[item.definition.attackType]]
                                    },
                                    damage: {
                                        diceString: item.definition.damage.diceString,
                                        type: item.definition.damageType,
                                        attribute: _ABILITY[_ABILITIES[item.definition.attackType]]
                                    },
                                    description: replaceChars(item.definition.description),
                                    magic: magic
                                };

                                item.definition.grantedModifiers.forEach(function(grantedMod) {
                                    if(grantedMod.type == 'damage') {
                                        attack.damage2 = {
                                            diceString: grantedMod.dice.diceString,
                                            type: grantedMod.friendlySubtypeName,
                                            attribute: grantedMod.statId == null ? '0' : _ABILITY[_ABILITIES[grantedMod.statId]]
                                        };
                                    }
                                });

                                var attackid = createRepeatingAttack(object, attack);
                                // /CREATE ATTACK
                            }
                            attributes["repeating_inventory_"+row+"_itemmodifiers"] = _itemmodifiers;
                            setAttrs(object.id, attributes);
                        });
                    }

                    // If character has unarmored defense, add it to the inventory, so a player can enable/disable it.
                    var unarmored = getObjects(character, 'subType', 'unarmored-armor-class');
                    if(unarmored != null) unarmored.forEach(function(ua) {
                        if(ua.type != 'set') return;
                        if(ua.value == null) {
                            ua.value = Math.floor((getTotalAbilityScore(character, ua.statId) - 10) / 2);
                        }

                        var row = generateRowID();
                        var attributes = {}
                        attributes["repeating_inventory_"+row+"_itemname"] = 'Unarmored Defense';
                        attributes["repeating_inventory_"+row+"_equipped"] = !hasArmor ? '1' : '0';
                        attributes["repeating_inventory_"+row+"_itemcount"] = 1;
                        attributes["repeating_inventory_"+row+"_itemmodifiers"] = 'AC: '+ua.value;
                        setAttrs(object.id, attributes);
                    });

                    // Languages
                    if(state[state_name].config.imports.languages){
                        var languages = getObjects(character, 'type', 'language');
                        var langs = [];
                        if(languages != null) {
                            languages.forEach(function(language) {
                                langs.push(language.friendlySubtypeName);
                            });
                        }

                        var row = generateRowID();

                        var attributes = {};
                        attributes["repeating_proficiencies_"+row+"_name"] = langs.join(', ');
                        attributes["repeating_proficiencies_"+row+"_prof_type"] = 'LANGUAGE';
                        attributes["repeating_proficiencies_"+row+"_options-flag"] = '0';

                        setAttrs(object.id, attributes);
                    }

                    // Import Proficiencies
                    if(state[state_name].config.imports.proficiencies){
                        const weapons = ['Club', 'Dagger', 'Greatclub', 'Handaxe', 'Javelin', 'Light hammer', 'Mace', 'Quarterstaff', 'Sickle', 'Spear', 'Crossbow, Light', 'Dart', 'Shortbow', 'Sling', 'Battleaxe', 'Flail', 'Glaive', 'Greataxe', 'Greatsword', 'Halberd', 'Lance', 'Longsword', 'Maul', 'Morningstar', 'Pike', 'Rapier', 'Scimitar', 'Shortsword', 'Trident', 'War pick', 'Warhammer', 'Whip', 'Blowgun', 'Crossbow, Hand', 'Crossbow, Heavy', 'Longbow', 'Net'];
                        var proficiencies = getObjects(character, 'type', 'proficiency');
                        if(proficiencies != null) {
                            proficiencies.forEach(function(prof) {
                                var row = generateRowID();

                                var attributes = {}
                                attributes["repeating_proficiencies_"+row+"_name"] = prof.friendlySubtypeName;
                                attributes["repeating_proficiencies_"+row+"_prof_type"] = (prof.subType.includes('weapon') || weapons.includes(prof.friendlySubtypeName)) ? 'WEAPON' : (prof.subType.includes('armor') || prof.subType.includes('shield')) ? 'ARMOR' : 'OTHER';

                                var skill = prof.subType.replace(/-/g, '_');
                                if(skills.includes(skill)){
                                    attributes[skill + '_prof'] = '(@{pb}*@{'+skill+'_type})';
                                }

                                attributes["repeating_proficiencies_"+row+"_options-flag"] = '0';

                                setAttrs(object.id, attributes);
                            });
                        }
                    }

                    if(state[state_name].config.imports.traits) {
                        // Background Feature
                        if(character.background.definition != null) {
                            var btrait = {
                                name: character.background.definition.featureName,
                                description: replaceChars(character.background.definition.featureDescription),
                                source: 'Background',
                                source_type: character.background.definition.name
                            }

                            createRepeatingTrait(object, btrait);
                        }
                        // Custom Background Feature
                        if(character.background.customBackground.name != null) {
                            var btrait = {
                                name: character.background.customBackground.featuresBackground.featureName,
                                description: replaceChars(character.background.customBackground.featuresBackground.featureDescription),
                                source: 'Background',
                                source_type: character.background.customBackground.name
                            };

                            createRepeatingTrait(object, btrait);
                        }

                        // Feats
                        character.feats.forEach(function(feat) {
                            var t = {
                                name: feat.definition.name,
                                description: replaceChars(feat.definition.description),
                                source: 'Feat',
                                source_type: feat.definition.name
                            };

                            createRepeatingTrait(object, t);
                        });

                        // Race Features
                        if(character.race.racialTraits != null) {
                            character.race.racialTraits.forEach(function(trait) {
                                if(['Languages', 'Darkvision', 'Superior Darkvision', 'Skills', 'Ability Score Increase', 'Feat', 'Age', 'Alignment', 'Size', 'Speed', 'Skill Versatility', 'Dwarven Combat Training', 'Keen Senses', 'Elf Weapon Training', 'Extra Language', 'Tool Proficiency'].indexOf(trait.definition.name) !== -1) {
                                    return;
                                }

                                var description = '';
                                if(trait.options != null) {
                                    trait.options.forEach(function(option) {
                                        description += option.name + '\n';
                                        description += (option.description !== '') ? option.description + '\n\n' : '\n';
                                    });
                                }

                                description += trait.definition.description;

                                var t = {
                                    name: trait.definition.name,
                                    description: replaceChars(description),
                                    source: 'Race',
                                    source_type: character.race.fullName
                                };

                                createRepeatingTrait(object, t);
                            });
                        }
                    }

                    // Handle (Multi)Class Features
                    var multiclass_level = 0;
                    var total_level = 0;
                    if(state[state_name].config.imports.classes){
                        var i = 0;
                        character.classes.forEach(function(current_class) {
                            total_level += current_class.level;

                            if(!current_class.isStartingClass){
                                var multiclasses = {};
                                multiclasses['multiclass'+i+'_flag'] = '1';
                                multiclasses['multiclass'+i+'_lvl'] = current_class.level;
                                multiclasses['multiclass'+i] = current_class.definition.name.toLowerCase();
                                multiclasses['multiclass'+i+'_subclass'] = current_class.subclassDefinition == null ? '' : current_class.subclassDefinition.name;
                                setAttrs(object.id, multiclasses);

                                multiclass_level += current_class.level;
                            }

                            // Set Pact Magic as class resource
                            if(current_class.definition.name.toLowerCase() === 'warlock'){
                                var attributes = {}
                                attributes['other_resource_name'] = 'Pact Magic';
                                attributes['other_resource_max'] = getPactMagicSlots(current_class.level);
                                attributes['other_resource'] = getPactMagicSlots(current_class.level);
                                setAttrs(object.id, attributes);
                            }

                            if(state[state_name].config.imports.class_traits){
                                current_class.definition.classFeatures.forEach(function(trait) {
                                    if(['Spellcasting', 'Divine Domain', 'Ability Score Improvement', 'Bonus Cantrip', 'Proficiencies', 'Hit Points', 'Arcane Tradition', 'Otherworldly Patron', 'Pact Magic', 'Expanded Spell List', 'Ranger Archetype', 'Druidic', 'Druid Circle', 'Sorcerous Origin', 'Monastic Tradition', 'Bardic College', 'Expertise', 'Roguish Archetype', 'Sacred Oath', 'Oath Spells', 'Martial Archetype'].indexOf(trait.name) !== -1) {
                                        return;
                                    }
                                    if(trait.requiredLevel > current_class.level) return;

                                    if(trait.name.includes('Jack')){
                                        jack = '@{jack}';
                                    }

                                    var description = '';

                                    description += trait.description;

                                    var t = {
                                        name: trait.name,
                                        description: replaceChars(description),
                                        source: 'Class',
                                        source_type: current_class.definition.name
                                    };

                                    createRepeatingTrait(object, t);

                                    if(trait.name == 'Metamagic') {
                                        character.choices.class.forEach(function(option) {
                                            if(option.type == 3 && (option.optionValue >= 106 && option.optionValue <= 113)) {
                                                var item = getObjects(option.options, 'id', option.optionValue);

                                                if(item.length > 0) {
                                                    item = item[0];
                                                    var o = {
                                                        name: item.label,
                                                        description: item.description,
                                                        source: 'Class',
                                                        source_type: current_class.definition.name
                                                    };

                                                    createRepeatingTrait(object, o);
                                                }
                                            }
                                        });
                                    }
                                });

                                if(current_class.subclassDefinition != null) {
                                    current_class.subclassDefinition.classFeatures.forEach(function(trait) {
                                        if(['Spellcasting', 'Bonus Proficiency', 'Divine Domain', 'Ability Score Improvement', 'Bonus Cantrip', 'Proficiencies', 'Hit Points', 'Arcane Tradition', 'Otherworldly Patron', 'Pact Magic', 'Expanded Spell List', 'Ranger Archetype', 'Druidic', 'Druid Circle', 'Sorcerous Origin', 'Monastic Tradition', 'Bardic College', 'Expertise', 'Roguish Archetype', 'Sacred Oath', 'Oath Spells', 'Martial Archetype'].indexOf(trait.name) !== -1) {
                                            return;
                                        }
                                        if(trait.requiredLevel > current_class.level) return;

                                        if(trait.name.includes('Jack')){
                                            jack = '@{jack}';
                                        }

                                        var description = '';
                                        /*trait.options.forEach(function(option) {
                                         description += option.name + '\n';
                                         description += (option.description !== '') ? option.description + '\n\n' : '\n';
                                         });*/

                                        description += trait.description;

                                        var t = {
                                            name: trait.name,
                                            description: replaceChars(description),
                                            source: 'Class',
                                            source_type: current_class.definition.name
                                        }

                                        createRepeatingTrait(object, t);
                                    });
                                }


                            }

                            // Class Spells
                            if(state[state_name].config.imports.class_spells){
                                //class_spells = class_spells.concat(current_class.spells);
                                for(var i in character.classSpells) {
                                    var spells = character.classSpells[i];
                                    if(character.classSpells[i].characterClassId == current_class.id) {
                                        character.classSpells[i].spells.forEach(function(spell) {
                                            spell.spellCastingAbility = _ABILITIES[current_class.definition.spellCastingAbilityId];
                                            class_spells.push(spell);
                                        });
                                    }
                                }
                            }

                            i++;
                        });
                    }

                    getObjects(character, 'type', 'expertise').forEach(function(expertise) {
                        var attributes = {};
                        var type = expertise.subType.replace(/-/g, '_');
                        if(skills.includes(type)){
                            attributes[type + '_type'] = "2";
                        }

                        if(expertise.subType === 'thieves-tools'){
                            var row = generateRowID();

                            var attributes = {}
                            attributes["repeating_proficiencies_"+row+"_name"] = expertise.friendlySubtypeName;
                            attributes["repeating_proficiencies_"+row+"_prof_type"] = 'OTHER';
                            attributes["repeating_proficiencies_"+row+"_options-flag"] = '0';
                        }

                        setAttrs(object.id, attributes);
                    });

                    var bonuses = getObjects(character, 'type', 'bonus');
                    var bonus_attributes = {};
                    if(state[state_name].config.imports.bonuses){
                        bonuses.forEach(function(bonus){
                            if(!bonus.id.includes('spell')){
                                switch(bonus.subType){
                                    case 'saving-throws':
                                        bonus_attributes['strength_save_mod'] = bonus.value;
                                        bonus_attributes['dexterity_save_mod'] = bonus.value;
                                        bonus_attributes['constitution_save_mod'] = bonus.value;
                                        bonus_attributes['intelligence_save_mod'] = bonus.value;
                                        bonus_attributes['wisdom_save_mod'] = bonus.value;
                                        bonus_attributes['charisma_save_mod'] = bonus.value;
                                        break;

                                    default:
                                        var type = bonus.subType.replace(/-/g, '_')
                                        if(skills.includes(type)){
                                            bonus_attributes[type + '_flat'] = bonus.value;
                                        }
                                        break;
                                }
                            }
                        })
                    }

                    var contacts = '',
                        treasure = '',
                        otherNotes = '';
                    if(state[state_name].config.imports.notes){
                        contacts += (character.notes.allies) ? 'ALLIES:\n' + character.notes.allies + '\n\n' : '';
                        contacts += (character.notes.organizations) ? 'ORGANIZATIONS:\n' + character.notes.organizations + '\n\n' : '';
                        contacts += (character.notes.enemies) ? 'ENEMIES:\n' + character.notes.enemies : '';

                        treasure += (character.notes.personalPossessions) ? 'PERSONAL POSSESSIONS:\n' + character.notes.personalPossessions + '\n\n' : '';
                        treasure += (character.notes.otherHoldings) ? 'OTHER HOLDINGS:\n' + character.notes.otherHoldings : '';

                        otherNotes += (character.notes.otherNotes) ? 'OTHER NOTES:\n' + character.notes.otherNotes + '\n\n' : '';
                        otherNotes += (character.faith) ? 'FAITH: ' + character.faith + '\n' : '';
                        otherNotes += (character.lifestyle) ? 'Lifestyle: ' + character.lifestyle.name + ' with a ' + character.lifestyle.cost + ' cost.' : '';
                    }

                    var background = '';
                    if(character.background.definition != null) background = character.background.definition.name;
                    if(background == '' && character.background.customBackground.name != null) background = character.background.customBackground.name;

                    var other_attributes = {
                        // Base Info
                        'level': character.classes[0].level + multiclass_level,
                        'experience': character.currentXp,
                        'race': character.race.fullName,
                        'background': background,
                        'speed': speed,
                        'hp_temp': character.temporaryHitPoints || '',
                        'inspiration': (character.inspiration) ? 'on' : 0,

                        // Bio Info
                        /*'age': character.age,
                         'size': character.size,
                         'height': character.height,
                         'weight': character.weight,
                         'eyes': character.eyes,
                         'hair': character.hair,
                         'skin': character.skin,
                         'character_appearance': character.traits.appearance,*/

                        // Ability Scores
                        'strength_base': getTotalAbilityScore(character, 1),
                        'dexterity_base': getTotalAbilityScore(character, 2),
                        'constitution_base': getTotalAbilityScore(character, 3),
                        'intelligence_base': getTotalAbilityScore(character, 4),
                        'wisdom_base': getTotalAbilityScore(character, 5),
                        'charisma_base': getTotalAbilityScore(character, 6),

                        // Class(es)
                        'class': character.classes[0].definition.name,
                        'subclass': character.classes[0].subclassDefinition == null ? '' : character.classes[0].subclassDefinition.name,
                        'base_level': character.classes[0].level,

                        // Traits
                        'personality_traits': character.traits.personalityTraits,
                        'options-flag-personality': '0',
                        'ideals': character.traits.ideals,
                        'options-flag-ideals': '0',
                        'bonds': character.traits.bonds,
                        'options-flag-bonds': '0',
                        'flaws': character.traits.flaws,
                        'options-flag-flaws': '0',

                        // currencies
                        'cp': character.currencies.cp,
                        'sp': character.currencies.sp,
                        'gp': character.currencies.gp,
                        'ep': character.currencies.ep,
                        'pp': character.currencies.pp,

                        // Notes/Bio
                        'character_backstory': character.notes.backstory,
                        'allies_and_organizations': contacts,
                        'additional_feature_and_traits': otherNotes,
                        'treasure': treasure,

                        'global_save_mod_flag': 1,
                        'global_skill_mod_flag': 1,
                        'global_attack_mod_flag': 1,
                        'global_damage_mod_flag': 1,
                        'dtype': 'full',

                        'jack_of_all_trades': jack
                    };

                    setAttrs(object.id, Object.assign(other_attributes, bonus_attributes));

                    if(state[state_name].config.imports.class_spells || true){
                        importSpells(class_spells);
                    }

                    var hp = Math.floor(character.baseHitPoints + ( total_level * Math.floor( ( ( getTotalAbilityScore(character, 3) - 10 ) / 2 ) ) ) );

                    var hpLevelBons = getObjects(character, 'subType', 'hit-points-per-level').forEach(function(bons) {
                        hp += total_level * bons.value;
                    });

                    createObj('attribute', {
                        characterid: object.id,
                        name: 'hp',
                        current: hp,
                        max: hp
                    });

                    if(class_spells.length > 15){
                        sendChat('', '<div style="'+style+'">Import of <b>' + character.name + '</b> is almost ready.<br><p>There are some more spells than expected, they will be imported over time.</p></div>', null, {noarchive:true});
                    }else{
                        sendChat('', '<div style="'+style+'">Import of <b>' + character.name + '</b> is ready.</div>', null, {noarchive:true});
                    }
                    break;

                default:
                    sendHelpMenu();
                    break;
            }
        }
    });

    const getPactMagicSlots = function(level) {
        switch(level){
            case 1:
                return 1;
                break;

            case 2: case 3: case 4: case 5: case 6: case 7: case 8: case 9: case 10:
            return 2;
            break;

            case 11: case 12: case 13: case 14: case 15: case 16:
            return 3;
            break;

            default:
                return 4
                break;
        }
        return 0;
    };

    const importSpells = function(array) {
        // set this to whatever number of items you can process at once
        var chunk = 10;
        var index = 0;
        function doChunk() {
            var cnt = chunk;
            while (cnt-- && index < array.length) {
                importSpell(array[index]);
                ++index;
            }
            if (index < array.length) {
                // set Timeout for async iteration
                setTimeout(doChunk, 1);
            }
        }
        doChunk();
    };

    const importSpell = function(spell) {
        var level = (spell.definition.level === 0) ? 'cantrip' : spell.definition.level.toString();
        var row = generateRowID();

        spell.castingTime = {
            castingTimeInterval: spell.activation.activationTime,
        };
        if(spell.activation.activationType == 1) spell.castingTime.castingTimeUnit = 'Action';
        if(spell.activation.activationType == 3) spell.castingTime.castingTimeUnit = 'Bonus Action';
        if(spell.activation.activationType == 4) spell.castingTime.castingTimeUnit = 'Reaction';
        if(spell.activation.activationType == 5) spell.castingTime.castingTimeUnit = 'Second' + (spell.activation.activationTime != 1 ? 's' : '');
        if(spell.activation.activationType == 6) spell.castingTime.castingTimeUnit = 'Minute' + (spell.activation.activationTime != 1 ? 's' : '');
        if(spell.activation.activationType == 7) spell.castingTime.castingTimeUnit = 'Hour' + (spell.activation.activationTime != 1 ? 's' : '');
        if(spell.activation.activationType == 8) spell.castingTime.castingTimeUnit = 'Day' + (spell.activation.activationTime != 1 ? 's' : '');

        var attributes = {};
        attributes["repeating_spell-"+level+"_"+row+"_spellprepared"] = (spell.prepared || spell.alwaysPrepared) ? '1' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellname"] = spell.definition.name;
        attributes["repeating_spell-"+level+"_"+row+"_spelllevel"] = level;
        attributes["repeating_spell-"+level+"_"+row+"_spellschool"] = spell.definition.school.toLowerCase();
        attributes["repeating_spell-"+level+"_"+row+"_spellritual"] = (spell.ritual) ? '{{ritual=1}}' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellcastingtime"] = spell.castingTime.castingTimeInterval + ' ' + spell.castingTime.castingTimeUnit;
        attributes["repeating_spell-"+level+"_"+row+"_spellrange"] = (spell.definition.range.origin === 'Ranged') ? spell.definition.range.rangeValue + 'ft.' : spell.definition.range.origin;
        attributes["repeating_spell-"+level+"_"+row+"_options-flag"] = '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellritual"] = (spell.definition.ritual) ? '1' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellconcentration"] = (spell.definition.concentration) ? '{{concentration=1}}' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellduration"] = (spell.definition.duration.durationUnit !== null) ? spell.definition.duration.durationInterval + ' ' + spell.definition.duration.durationUnit : spell.definition.duration.durationType;
        attributes["repeating_spell-"+level+"_"+row+"_spell_ability"] = spell.spellCastingAbility == null ? '0*' : '@{'+_ABILITY[spell.spellCastingAbility]+'_mod}+';

        var descriptions = spell.definition.description.split('At Higher Levels. ');
        attributes["repeating_spell-"+level+"_"+row+"_spelldescription"] = replaceChars(descriptions[0]);
        attributes["repeating_spell-"+level+"_"+row+"_spellathigherlevels"] = (descriptions.length > 1) ? replaceChars(descriptions[1]) : '';

        var components = spell.definition.components;
        attributes["repeating_spell-"+level+"_"+row+"_spellcomp_v"] = (components.includes(1)) ? '{{v=1}}' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellcomp_s"] = (components.includes(2)) ? '{{s=1}}' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellcomp_m"] = (components.includes(3)) ? '{{m=1}}' : '0';
        attributes["repeating_spell-"+level+"_"+row+"_spellcomp_materials"] = (components.includes(3)) ? replaceChars(spell.definition.componentsDescription) : '';

        // Damage/Attack
        var damage = getObjects(spell, 'type', 'damage');
        if(damage.length !== 0 && (spell.definition.attackType !== "" || spell.definition.saveDcStat !== null)){
            damage = damage[0];
            if(spell.definition.attackType == 0) spell.definition.attackType = 'none';
            if(spell.definition.attackType == 1) spell.definition.attackType = 'melee';
            if(spell.definition.attackType == 2) spell.definition.attackType = 'ranged';
            attributes["repeating_spell-"+level+"_"+row+"_spellattack"] = (spell.definition.attackType === '') ? 'None' : spell.definition.attackType;
            attributes["repeating_spell-"+level+"_"+row+"_spellsave"] = (spell.definition.saveDcAbilityId === null) ? 'NONE' : ucFirst(_ABILITY[_ABILITIES[spell.definition.saveDcAbilityId]]);
            attributes["repeating_spell-"+level+"_"+row+"_spelldamage"] = (damage.die.fixedValue !== null) ? damage.die.fixedValue : damage.die.diceString;
            attributes["repeating_spell-"+level+"_"+row+"_spelldamagetype"] = damage.friendlySubtypeName;

            var ahl = spell.definition.atHigherLevels.higherLevelDefinitions;
            for(var i in ahl) {
                if(ahl[i].dice == null) continue;
                attributes["repeating_spell-"+level+"_"+row+"_spellhldie"] = ahl[i].dice.diceCount;
                attributes["repeating_spell-"+level+"_"+row+"_spellhldietype"] = 'd'+ahl[i].dice.diceValue;
            }

            /*//if(spell.definition.requiresAttackRoll) attributes["repeating_spell-"+level+"_"+row+"_spelldmgmod"] = 'yes';

             // FOR SPELLS WITH MULTIPLE DAMAGE OUTPUTS
             //attributes["repeating_spell-"+level+"_"+row+"_spelldamage2"] = damage.die.diceString;
             //attributes["repeating_spell-"+level+"_"+row+"_spelldamagetype2"] = damage.friendlySubtypeName;

             // CREATE ATTACK
             /!*var attack = {
             name: spell.definition.name,
             range: (spell.definition.range.origin === 'Ranged') ? spell.definition.range.rangeValue + 'ft.' : spell.definition.range.origin,
             attack: {
             attribute: _ABILITY[spell.spellCastingAbility] //_ABILITY[current_class.class.spellCastingAbility]
             },
             damage: {
             diceString: (damage.die.fixedValue !== null) ? damage.die.fixedValue : damage.die.diceString,
             type: damage.friendlySubtypeName,
             attribute: '0'
             },
             description: replaceChars(spell.definition.description)
             }

             var attackid = createRepeatingAttack(object, attack);
             attributes["repeating_spell-"+level+"_"+row+"_rollcontent"] = '%{'+object.id+'|repeating_attack_'+attackid+'_attack}';*!/
             // /CREATE ATTACK

             if(damage.hasOwnProperty('atHigherLevels') && damage.atHigherLevels.scaleType === 'spellscale'){
             attributes["repeating_spell-"+level+"_"+row+"_spellhldie"] = '1';
             attributes["repeating_spell-"+level+"_"+row+"_spellhldietype"] = 'd'+damage.die.diceValue;
             }*/

            /*//var newrowid = generateRowID();
             //attributes["repeating_spell-"+level+"_"+row+"_spellattackid"] = newrowid;
             //attributes["repeating_spell-"+level+"_"+row+"_rollcontent"] = "%{" + object.id + "|repeating_attack_" + newrowid + "_attack}";*/

            // attributes["repeating_spell-"+level+"_"+row+"_spelloutput"] = 'ATTACK';
        }

        setAttrs(object.id, attributes);
    };

    const ucFirst = function(string) {
        if(string == null) return string;
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    const sendConfigMenu = function(first) {
        var prefix = (state[state_name].config.prefix !== '') ? state[state_name].config.prefix : '[NONE]';
        var prefixButton = makeButton(prefix, '!beyond config prefix|?{Prefix}', buttonStyle);
        var overwriteButton = makeButton(state[state_name].config.overwrite, '!beyond config overwrite|'+!state[state_name].config.overwrite, buttonStyle);
        var debugButton = makeButton(state[state_name].config.debug, '!beyond config debug|'+!state[state_name].config.debug, buttonStyle);

        var listItems = [
            '<span style="float: left">Overwrite:</span> '+overwriteButton,
            '<span style="float: left">Prefix:</span> '+prefixButton,
            '<span style="float: left">Debug:</span> '+debugButton
        ]

        var debug = '';
        if(state[state_name].config.debug){
            var debugListItems = [];
            for(var importItemName in state[state_name].config.imports){
                var button = makeButton(state[state_name].config.imports[importItemName], '!beyond imports '+importItemName+'|'+!state[state_name].config.imports[importItemName], buttonStyle);
                debugListItems.push('<span style="float: left">'+importItemName+':</span> '+button)
            }

            debug += '<hr><b>Imports</b>'+makeList(debugListItems, 'overflow: hidden; list-style: none; padding: 0; margin: 0;', 'overflow: hidden');
        }

        var list = makeList(listItems, 'overflow: hidden; list-style: none; padding: 0; margin: 0;', 'overflow: hidden');

        var resetButton = makeButton('Reset', '!beyond reset', buttonStyle + ' width: 100%');

        var title_text = (first) ? script_name + ' First Time Setup' : script_name + ' Config';
        var text = '<div style="'+style+'">'+makeTitle(title_text)+list+debug+'<hr><p style="font-size: 80%">You can always come back to this config by typing `!beyond config`.</p><hr>'+resetButton+'</div>';

        sendChat('', '/w gm ' + text, null, {noarchive:true});
    };

    const sendHelpMenu = function(first) {
        var configButton = makeButton('Config', '!beyond config', buttonStyle+' width: 100%;');

        var listItems = [
            '<span style="text-decoration: underline">!beyond help</span> - Shows this menu.',
            '<span style="text-decoration: underline">!beyond config</span> - Shows the configuration menu.',
            '<span style="text-decoration: underline">!beyond import [CHARACTER JSON]</span> - Imports a character from <a href="http://www.dndbeyond.com" target="_blank">DNDBeyond</a>.',
        ]

        var command_list = makeList(listItems, 'list-style: none; padding: 0; margin: 0;')

        var text = '<div style="'+style+'">'+makeTitle(script_name + ' Help')+'<p>Go to a character on <a href="http://www.dndbeyond.com" target="_blank">DNDBeyond</a>, and put `/json` behind the link. Copy the full contents of this page and paste it behind the command `!beyond import`.</p><p>For more information take a look at my <a style="text-decoration: underline" href="https://github.com/RobinKuiper/Roll20APIScripts" target="_blank">Github</a> repository.</p><hr><b>Commands:</b>'+command_list+'<hr>'+configButton+'</div>';

        sendChat('', '/w gm ' + text, null, {noarchive:true});
    };

    const makeTitle = function(title) {
        return '<h3 style="margin-bottom: 10px;">'+title+'</h3>';
    };

    const makeButton = function(title, href, style) {
        return '<a style="'+style+'" href="'+href+'">'+title+'</a>';
    };

    const makeList = function(items, listStyle, itemStyle) {
        var list = '<ul style="'+listStyle+'">';
        items.forEach(function(item) {
            list += '<li style="'+itemStyle+'">'+item+'</li>';
        });
        list += '</ul>';
        return list;
    };

    const replaceChars = function(text) {
        text = text.replace('\&rsquo\;', '\'').replace('\&mdash\;','—').replace('\ \;',' ').replace('\&hellip\;','…');
        text = text.replace('\û\;','û').replace('’', '\'').replace(' ', ' ');
        text = text.replace(/\<li[^\>]+\>/gi,'• ').replace('\<\/li\>','');

        return text;
    };

    const createRepeatingTrait = function(object, trait) {
        var row = generateRowID();

        var attributes = {}
        attributes["repeating_traits_"+row+"_name"] = trait.name;
        attributes["repeating_traits_"+row+"_source"] = trait.source;
        attributes["repeating_traits_"+row+"_source_type"] = trait.source_type;
        attributes["repeating_traits_"+row+"_description"] = replaceChars(trait.description);
        attributes["repeating_traits_"+row+"_options-flag"] = '0';
        //attributes["repeating_traits_"+row+"_display_flag"] = false;
        setAttrs(object.id, attributes);
    };

    const createRepeatingAttack = function(object, attack) {
        var attackrow = generateRowID();
        var attackattributes = {};
        attackattributes["repeating_attack_"+attackrow+"_options-flag"] = '0';
        attackattributes["repeating_attack_"+attackrow+"_atkname"] = attack.name;
        attackattributes["repeating_attack_"+attackrow+"_atkflag"] = '{{attack=1}}';
        attackattributes["repeating_attack_"+attackrow+"_atkattr_base"] = '@{'+attack.attack.attribute+'_mod}';
        attackattributes["repeating_attack_"+attackrow+"_atkprofflag"] = '(@{pb})';
        attackattributes["repeating_attack_"+attackrow+"_atkmagic"] = attack.magic;
        attackattributes["repeating_attack_"+attackrow+"_atkrange"] = attack.range;

        attackattributes["repeating_attack_"+attackrow+"_dmgflag"] = '{{damage=1}} {{dmg1flag=1}}';
        attackattributes["repeating_attack_"+attackrow+"_dmgbase"] = attack.damage.diceString;
        attackattributes["repeating_attack_"+attackrow+"_dmgattr"] = (attack.damage.attribute === '0') ? '0' : '@{'+attack.damage.attribute+'_mod}';
        attackattributes["repeating_attack_"+attackrow+"_dmgtype"] = attack.damage.type;
        attackattributes["repeating_attack_"+attackrow+"_dmgcustcrit"] = attack.damage.diceString;

        if(attack.damage2 != null) {
            attackattributes["repeating_attack_"+attackrow+"_dmg2flag"] = '{{damage=1}} {{dmg2flag=1}}';
            attackattributes["repeating_attack_"+attackrow+"_dmg2base"] = attack.damage2.diceString;
            attackattributes["repeating_attack_"+attackrow+"_dmg2attr"] = (attack.damage2.attribute === '0') ? '0' : '@{'+attack.damage2.attribute+'_mod}';
            attackattributes["repeating_attack_"+attackrow+"_dmg2type"] = attack.damage2.type;
            attackattributes["repeating_attack_"+attackrow+"_dmg2custcrit"] = attack.damage2.diceString;
        }

        attackattributes["repeating_attack_"+attackrow+"_atk_desc"] = '';//replaceChars(attack.description);
        setAttrs(object.id, attackattributes);

        return attackrow;
    };

    const getTotalAbilityScore = function(character, scoreId) {
        var index = scoreId-1;
        var base = (character.stats[index].value == null ? 10 : character.stats[index].value),
            bonus = (character.bonusStats[index].value == null ? 0 : character.bonusStats[index].value),
            override = (character.overrideStats[index].value == null ? 0 : character.overrideStats[index].value),
            total = base + bonus,
            modifiers = getObjects(character, '', _ABILITY[_ABILITIES[scoreId]] + "-score");
        if(override > 0) total = override;
        if(modifiers.length > 0) {
            var used_ids = [];
            for(var i = 0; i < modifiers.length; i++){
                if(modifiers[i].type == 'bonus' && used_ids.indexOf(modifiers[i].id) == -1) {
                    total += modifiers[i].value;
                    used_ids.push(modifiers[i].id);
                }
            }
        }

        return total;
    };

    //return an array of objects according to key, value, or key and value matching
    const getObjects = function(obj, key, val) {
        var objects = [];
        for (var i in obj) {
            if (!obj.hasOwnProperty(i)) continue;
            if (typeof obj[i] == 'object') {
                objects = objects.concat(getObjects(obj[i], key, val));
            } else
            //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
            if (i == key && obj[i] == val || i == key && val == '') { //
                objects.push(obj);
            } else if (obj[i] == val && key == ''){
                //only add if the object is not already in the array
                if (objects.lastIndexOf(obj) == -1){
                    objects.push(obj);
                }
            }
        }
        return objects;
    };

    // Find an existing repeatable item with the same name, or generate new row ID
    const getOrMakeRowID = function(character,repeatPrefix,name){
        // Get list of all of the character's attributes
        var attrObjs = findObjs({ _type: "attribute", _characterid: character.get("_id") });

        var i = 0;
        while (i < attrObjs.length)
        {
            // If this is a feat taken multiple times, strip the number of times it was taken from the name
            /*var attrName = attrObjs[i].get("current").toString();
             if (regexIndexOf(attrName, / x[0-9]+$/) !== -1)
             attrName = attrName.replace(/ x[0-9]+/,"");

             if (attrObjs[i].get("name").indexOf(repeatPrefix) !== -1 && attrObjs[i].get("name").indexOf("_name") !== -1 && attrName === name)
             return attrObjs[i].get("name").substring(repeatPrefix.length,(attrObjs[i].get("name").indexOf("_name")));
             i++;*/
            i++;
        }
        return generateRowID();
    };

    const generateUUID = (function() {
        var a = 0, b = [];
        return function() {
            var c = (new Date()).getTime() + 0, d = c === a;
            a = c;
            for (var e = new Array(8), f = 7; 0 <= f; f--) {
                e[f] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c % 64);
                c = Math.floor(c / 64);
            }
            c = e.join("");
            if (d) {
                for (f = 11; 0 <= f && 63 === b[f]; f--) {
                    b[f] = 0;
                }
                b[f]++;
            } else {
                for (f = 0; 12 > f; f++) {
                    b[f] = Math.floor(64 * Math.random());
                }
            }
            for (f = 0; 12 > f; f++){
                c += "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);
            }
            return c;
        };
    }());

    const generateRowID = function() {
        "use strict";
        return generateUUID().replace(/_/g, "Z");
    };

    const regexIndexOf = function(str, regex, startpos) {
        var indexOf = str.substring(startpos || 0).search(regex);
        return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
    };

    const pre_log = function(message) {
        log('---------------------------------------------------------------------------------------------');
        log(message);
        log('---------------------------------------------------------------------------------------------');
    };

    const checkInstall = function() {
        if(!_.has(state, state_name)){
            state[state_name] = state[state_name] || {};
        }
        setDefaults();
    };

    const setDefaults = function(reset) {
        const defaults = {
            overwrite: false,
            debug: false,
            prefix: '',
            imports: {
                classes: true,
                class_spells: true,
                class_traits: true,
                inventory: true,
                proficiencies: false,
                traits: true,
                languages: true,
                bonusses: true,
                notes: true,
            }
        };

        if(!state[state_name].config){
            state[state_name].config = defaults;
        }else{
            if(!state[state_name].config.hasOwnProperty('overwrite')){
                state[state_name].config.overwrite = false;
            }
            if(!state[state_name].config.hasOwnProperty('debug')){
                state[state_name].config.debug = false;
            }
            if(!state[state_name].config.hasOwnProperty('prefix')){
                state[state_name].config.prefix = '';
            }
            if(!state[state_name].config.hasOwnProperty('imports')){
                state[state_name].config.imports = defaults.imports;
            }else{
                if(!state[state_name].config.imports.hasOwnProperty('inventory')){
                    state[state_name].config.imports.inventory = true;
                }
                if(!state[state_name].config.imports.hasOwnProperty('proficiencies')){
                    state[state_name].config.imports.proficiencies = true;
                }
                if(!state[state_name].config.imports.hasOwnProperty('traits')){
                    state[state_name].config.imports.traits = true;
                }
                if(!state[state_name].config.imports.hasOwnProperty('classes')){
                    state[state_name].config.imports.classes = true;
                }
                if(!state[state_name].config.imports.hasOwnProperty('notes')){
                    state[state_name].config.imports.notes = true;
                }
                if(!state[state_name].config.imports.hasOwnProperty('languages')){
                    state[state_name].config.imports.languages = true;
                }
                if(!state[state_name].config.imports.hasOwnProperty('bonusses')){
                    state[state_name].config.imports.bonusses = true;
                }
                if(!state[state_name].config.imports.hasOwnProperty('class_spells')){
                    state[state_name].config.imports.class_spells = true;
                }
                if(!state[state_name].config.imports.hasOwnProperty('class_traits')){
                    state[state_name].config.imports.class_traits = true;
                }
            }
            if(!state[state_name].config.hasOwnProperty('firsttime')){
                if(!reset){
                    sendConfigMenu(true);
                }
                state[state_name].config.firsttime = false;
            }
        }
    };
})();
