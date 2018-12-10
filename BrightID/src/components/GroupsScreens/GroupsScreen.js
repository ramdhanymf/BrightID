// @flow

import * as React from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  View,
} from 'react-native';
import { connect } from 'react-redux';
import { NavigationEvents } from 'react-navigation';
import Material from 'react-native-vector-icons/MaterialCommunityIcons';
import SearchGroups from './SearchGroups';
import EligibleGroupCard from './EligibleGroupCard';
import CurrentGroupCard from './CurrentGroupCard';
import BottomNav from '../BottomNav';
import reloadUserInfo from '../../actions/reloadUserInfo';
import { obj2b64, objToUint8 } from '../../utils/encoding';
import api from '../../Api/BrightIdApi';

/**
 * Groups screen of BrightID
 * =======================================================
 */

/**
 * CONSTANTS
 * =======================================================
 */

const ICON_SIZE = 36;

const groupData = [
  { name: 'Whisler Crew', trustScore: '94.5' },
  { name: 'Hawaii Fam', trustScore: '92.5' },
  { name: 'Henry McWellington', trustScore: '5.6' },
  { name: "Von Neuman's Mad Scientists", trustScore: '99.9' },
];

type Props = {
  connections: Array<{
    firstName: string,
    lastName: string,
    id: number,
  }>,
  searchParam: string,
  // eligibleGroups comes from store and contains list of user eligible groups.
  eligibleGroups: [{}],
  currentGroups: [{}],
  navigation: {
    navigate: () => null,
  },
};

type State = {
  userInfoLoading: boolean,
};

class ConnectionsScreen extends React.Component<Props, State> {
  static navigationOptions = () => ({
    title: 'Groups',
    headerRight: <View />,
  });

  state = {
    userInfoLoading: false,
  };

  renderCurrentGroup = ({ item }) => (
    <CurrentGroupCard name={item.nameornym} trustScore={item.score} />
  );

  refreshUserInfo = async () => {
    let { dispatch } = this.props;
    this.setState({ userInfoLoading: true });
    await dispatch(reloadUserInfo());
    this.setState({ userInfoLoading: false });
  };

  getTwoEligibleGroup() {
    let { eligibleGroups } = this.props;
    let groups = eligibleGroups.filter((group) => group.isNew);
    if (groups.length < 2) {
      Array.prototype.push.apply(
        groups,
        eligibleGroups.filter((group) => !group.isNew),
      );
    }
    if (groups.length > 2) groups = [groups[0], groups[1]];
    return groups;
  }

  mapPublicKeysToNames(publicKeys) {
    let { connections } = this.props;
    let names = [];
    let user = api.urlSafe(obj2b64(this.props.publicKey));
    publicKeys.map((publicKey) => {
      if (publicKey === user) names.push('You');
      else {
        let findedConnection = connections.find(
          (connection) =>
            api.urlSafe(obj2b64(connection.publicKey)) === publicKey,
        );
        names.push(
          findedConnection
            ? findedConnection.nameornym.split(' ')[0]
            : 'Unknown',
        );
      }
    });
    return names;
  }

  noCurrentGroups = () => (
    <View style={styles.noCurrentGroups}>
      <Image
        source={require('../../static/groups_logo.png')}
        style={styles.groupsLogo}
        resizeMode="cover"
        onError={(e) => {
          console.log(e.error);
        }}
        accessible={true}
        accessibilityLabel="groups logo"
      />
      <View>
        <Text style={styles.emptyGroupsText}>By creating and joining</Text>
        <Text style={styles.emptyGroupsText}>groups, you can increase </Text>
        <Text style={styles.emptyGroupsText}>your score</Text>
      </View>
    </View>
  );

  noEligibleGroups = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No Eligible Groups</Text>
    </View>
  );

  renderEligibleGroups() {
    let { eligibleGroups, publicKey } = this.props;

    let twoEligibleGroups = this.getTwoEligibleGroup();
    if (eligibleGroups.length > 0) {
      return (
        <View style={styles.eligibleContainer}>
          <Text style={styles.groupTitle}>ELIGIBLE</Text>
          {twoEligibleGroups.map((group) => (
            <EligibleGroupCard
              key={group.id}
              groupId={group.id}
              names={this.mapPublicKeysToNames(group.knownMembers)}
              alreadyIn={
                group.knownMembers.indexOf(api.urlSafe(obj2b64(publicKey))) >= 0
              }
              trustScore={group.trustScore}
            />
          ))}
        </View>
      );
    } else {
      return this.noEligibleGroups();
    }
  }

  renderSeeAllButtom() {
    let { eligibleGroups } = this.props;
    if (eligibleGroups.length > 2) {
      return (
        <TouchableOpacity style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>
            See all {this.props.eligibleGroups.length}
          </Text>
        </TouchableOpacity>
      );
    } else {
      return <View />;
    }
  }

  renderCurrentGroups() {
    let { currentGroups } = this.props;
    if (currentGroups.length > 0) {
      return (
        <View style={styles.currentContainer}>
          <Text style={styles.groupTitle}>CURRENT</Text>
          <FlatList
            data={currentGroups}
            renderItem={this.renderCurrentGroup}
            horizontal={true}
            keyExtractor={({ id }, index) => id}
          />
        </View>
      );
    } else {
      return this.noCurrentGroups();
    }
  }

  render() {
    const { navigation, currentGroups, publicKey, eligibleGroups } = this.props;

    return (
      <View style={styles.container}>
        <View style={styles.mainContainer}>
          <NavigationEvents onDidFocus={this.refreshUserInfo} />
          <SearchGroups />

          {this.state.userInfoLoading && (
            <View style={styles.alignCenter}>
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          )}

          {this.renderEligibleGroups()}

          <View style={styles.eligibleBottomView} />

          {this.renderCurrentGroups()}

          <View style={styles.addGroupButtonContainer}>
            <TouchableOpacity
              style={styles.addGroupButton}
              onPress={() => {
                navigation.navigate('NewGroup');
              }}
            >
              <Material
                size={ICON_SIZE}
                name="plus"
                color="#fff"
                style={{ width: ICON_SIZE, height: ICON_SIZE }}
              />
            </TouchableOpacity>
          </View>
        </View>
        <BottomNav navigation={navigation} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  mainContainer: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  eligibleContainer: {
    backgroundColor: '#fff',
    marginTop: 7,
    paddingTop: 9,
    width: '100%',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.32)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  groupTitle: {
    fontFamily: 'ApexNew-Book',
    fontSize: 18,
    paddingBottom: 5,
  },
  eligibleBottomView: {
    borderTopColor: '#e3e0e4',
    borderTopWidth: 1,
    width: '90%',
  },
  seeAllButton: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    height: 38,
  },
  seeAllText: {
    fontFamily: 'ApexNew-Medium',
    fontSize: 18,
    color: '#4A8FE6',
  },

  currentGroupsHeader: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomColor: '#e3e0e4',
    borderBottomWidth: 1,
  },
  currentContainer: {
    backgroundColor: '#fff',
    marginTop: 9,
    paddingTop: 9,
    width: '100%',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.32)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  currentGroupRow: {
    width: '100%',
    flexDirection: 'row',
  },
  addGroupButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 100,
    right: 25,
    bottom: 25,
  },
  addGroupButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f98961',
    width: 54,
    height: 54,
    borderRadius: 27,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  alignCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    width: '90%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: '#fff',
    height: 90,
    borderTopColor: '#e3e0e4',
    borderTopWidth: 1,
  },
  noCurrentGroups: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emptyGroupsText: {
    fontFamily: 'ApexNew-Book',
    fontSize: 18,
    fontWeight: 'normal',
    fontStyle: 'normal',
    letterSpacing: 0,
    color: '#4a4a4a',
  },
});

export default connect((state) => state.main)(ConnectionsScreen);
