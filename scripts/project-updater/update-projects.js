

const fs = require("fs")
const path = require("path")
const { PrismaClient } = require("@prisma/client")
const db = new PrismaClient()

async function updateProject(data) {

    const project = await db.project.findFirst({
        where: { slug: data.slug }
    })

    if (!project) {
        console.log(`❌ Project not found: ${data.slug}`)
        return
    }

    const updateData = {
        name: data.name,
        developer: data.developer,
        location: data.location,
        propertyType: data.propertyType,
        description: data.description,
        unitTypes: data.unitTypes,
        highlights: data.highlights,
        amenities: data.amenities,
        gallery: data.gallery,
        // Safely apply other fields if available in data
        ...(data.startingPrices && { startingPrices: data.startingPrices }),
        ...(data.handover && { handover: data.handover }),
        ...(data.ecoConcept && { ecoConcept: data.ecoConcept }),
        ...(data.paymentPlan && { paymentPlan: data.paymentPlan }),
        ...(data.connectivity && { connectivity: data.connectivity })
    };

    try {
        await db.project.update({
            where: { id: project.id },
            data: updateData
        })
        console.log(`✅ Updated ${data.name}`)
    } catch (err) {
        console.log(`❌ Failed to update ${data.name}:`, err.message)
    }
}

async function run() {

    console.log("\n══════════════════════════════════════")
    console.log(" MillionFlats — Project Updater")
    console.log("══════════════════════════════════════\n")

    const chelsea = require("./data/chelsea-residences.json")
    const islands = require("./data/damac-islands-2.json")

    await updateProject(chelsea)
    await updateProject(islands)

    console.log("\n🎉 Projects Updated Successfully\n")
    await db.$disconnect()
}

run()
