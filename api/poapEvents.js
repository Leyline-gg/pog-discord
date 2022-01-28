import admin from 'firebase-admin';

/**
 * Creates a poap event in Firestore from the given `PoapClaimEvent` object
 * @param {PoapClaimEvent} event
 */
 export const createPoapEvent = async function (event) {
	await admin.firestore()
		.collection('discord/bot/poap_events')
		.doc(event.id)
		.set({
			expires: Date.now() + event.duration,
			created_on: event?.msg?.createdTimestamp || Date.now(),
			created_by: event.author.id,
			poap_filename: event.poap_filename,
            channel: event.channel,
		});
	return;
};

/**
 * Retrieves the `DocumentSnapshot.data()` for a given poap event
 * @param {String} id ID of the event to retrieve
 * @param {boolean} [include_metadata] Whether or not to return the raw DocumentSnapshot if it exists (pass `true`), or an Object with the document's data (default)
 * @returns {Promise<Object | FirebaseFirestore.DocumentSnapshot | null>} `null` if document does not exist, else see `include_metadata`
 */
 export const getPoapEvent = async function (id, include_metadata = false) {
	const res = await admin.firestore().collection('discord/bot/poap_events').doc(id).get();
	if (!res.exists) return null;
	return include_metadata ? res : res.data();
};

/**
 *
 * @param {Object} args Destructured args
 * @param {PoapClaimEvent} args.event The poap event to store the claim under
 * @param {ButtonInteraction} args.claim The interaction that represents the user's claim
 * @returns {Promise<Object>} The stored claim data that was written
 */
export const storePoapEventClaim = async function ({event, claim}) {
	const obj = {
		claimed: true,
		timestamp: Date.now(),
	};
	await admin.firestore()
        .collection('discord/bot/poap_events').doc(event.id)
        .collection('claims').doc(claim.user.id)
        .set(obj);
	return obj;
};
